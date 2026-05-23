using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Reports;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Aggregates over Paid orders. Every query is tenant-scoped automatically via
/// the AppDbContext global query filter on ITenantEntity.
///
/// Half-open [from, to) range: callers pass (today 00:00, tomorrow 00:00) for "today".
///
/// EF Core rule used throughout:
///   Navigation in Where() → EF Core emits a JOIN internally → grouped elements
///   become TransparentIdentifier<Outer,Inner> → Sum/Count inside GroupBy.Select()
///   can't reference e.Outer.* — translation fails.
///
/// Pattern that always works:
///   .Where(nav filter)
///   .Select(flatten to plain anon type)   ← breaks the TransparentIdentifier
///   .GroupBy(...)
///   .Select(aggregate)
/// </summary>
public class ReportsService(AppDbContext db) : IReportsService
{
    public async Task<ReportSummaryDto> GetSummaryAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        var orderCount = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to, ct);

        if (orderCount == 0)
            return new ReportSummaryDto(0m, 0, 0m, 0);

        // Flatten before GroupBy — no navigation inside the aggregate.
        var itemStats = await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { i.Quantity, LineTotal = i.Price * i.Quantity })
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Revenue   = g.Sum(x => x.LineTotal),
                ItemsSold = g.Sum(x => x.Quantity),
            })
            .FirstOrDefaultAsync(ct);

        var revenue   = itemStats?.Revenue   ?? 0m;
        var itemsSold = itemStats?.ItemsSold ?? 0;
        return new ReportSummaryDto(revenue, orderCount, revenue / orderCount, itemsSold);
    }

    public async Task<List<TopItemDto>> GetTopItemsAsync(DateTime from, DateTime to, int limit, CancellationToken ct = default)
    {
        // Two-step approach:
        //  1. Pre-fetch paid order IDs → GroupBy sees only scalar columns, no JOIN/TransparentIdentifier.
        //  2. Project to anonymous type (not the named record) → EF Core's GroupBy translator
        //     can't translate positional record constructors inside Select; anonymous types work.
        //  Map to TopItemDto in memory after ToListAsync.

        var paidOrderIds = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to)
            .Select(o => o.Id)
            .ToListAsync(ct);

        if (paidOrderIds.Count == 0) return [];

        var rows = await db.OrderItems
            .Where(i => paidOrderIds.Contains(i.OrderId))
            .Select(i => new { i.MenuItemId, i.MenuItemName, i.Quantity, LineTotal = i.Price * i.Quantity })
            .GroupBy(x => new { x.MenuItemId, x.MenuItemName })
            .Select(g => new
            {
                MenuItemId   = g.Key.MenuItemId,
                MenuItemName = g.Key.MenuItemName,
                Quantity     = g.Sum(x => x.Quantity),
                Revenue      = g.Sum(x => x.LineTotal),
            })
            .OrderByDescending(x => x.Quantity)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(x => new TopItemDto(x.MenuItemId, x.MenuItemName, x.Quantity, x.Revenue)).ToList();
    }

    public async Task<List<TopServerDto>> GetTopServersAsync(DateTime from, DateTime to, int limit, CancellationToken ct = default)
    {
        // Three flat queries merged in memory.
        // Revenue query: flatten before GroupBy to avoid TransparentIdentifier in aggregates.

        // 1. Order count per user.
        var orderCounts = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to)
            .GroupBy(o => o.CreatedById)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        if (orderCounts.Count == 0) return [];

        // 2. Revenue per user — flatten (pull CreatedById into the projection) before GroupBy.
        var revenues = await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { CreatedById = i.Order.CreatedById, LineTotal = i.Price * i.Quantity })
            .GroupBy(x => x.CreatedById)
            .Select(g => new { UserId = g.Key, Revenue = g.Sum(x => x.LineTotal) })
            .ToDictionaryAsync(x => x.UserId, x => x.Revenue, ct);

        // 3. Display names (Users is tenant-filtered automatically).
        var userIds = orderCounts.Keys.ToList();
        var names = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, Name = u.FirstName + " " + u.LastName })
            .ToDictionaryAsync(u => u.Id, u => u.Name, ct);

        return orderCounts
            .Select(kv => new TopServerDto(
                kv.Key,
                names.GetValueOrDefault(kv.Key, "Unknown"),
                kv.Value,
                revenues.GetValueOrDefault(kv.Key, 0m)
            ))
            .OrderByDescending(s => s.Revenue)
            .Take(limit)
            .ToList();
    }

    public async Task<List<RevenuePointDto>> GetRevenueTrendAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        // .Date → Npgsql translates to DATE("CreatedAt") in PostgreSQL.
        // Flatten before GroupBy for the same reason as above.

        var revenueRaw = await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { Date = i.Order.CreatedAt.Date, LineTotal = i.Price * i.Quantity })
            .GroupBy(x => x.Date)
            .Select(g => new { Date = g.Key, Revenue = g.Sum(x => x.LineTotal) })
            .ToListAsync(ct);

        var countRaw = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // .Date returns DateTime (midnight); convert to DateOnly for the DTO contract.
        var revenueByDate = revenueRaw.ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Revenue);
        var countByDate   = countRaw  .ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Count);

        // Fill every day — zero-bar days make the chart honest.
        var points = new List<RevenuePointDto>();
        for (var d = DateOnly.FromDateTime(from); d < DateOnly.FromDateTime(to); d = d.AddDays(1))
            points.Add(new RevenuePointDto(d, revenueByDate.GetValueOrDefault(d, 0m), countByDate.GetValueOrDefault(d, 0)));

        return points;
    }
}
