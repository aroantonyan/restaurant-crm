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
        // ── Current period ──────────────────────────────────────────────────────
        var orderCount = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to, ct);

        var itemStats = orderCount == 0 ? null : await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { i.Quantity, LineTotal = i.Price * i.Quantity })
            .GroupBy(_ => 1)
            .Select(g => new { Revenue = g.Sum(x => x.LineTotal), ItemsSold = g.Sum(x => x.Quantity) })
            .FirstOrDefaultAsync(ct);

        var revenue   = itemStats?.Revenue   ?? 0m;
        var itemsSold = itemStats?.ItemsSold ?? 0;

        // ── Prior period — same duration immediately before `from` ───────────
        var duration  = to - from;
        var priorFrom = from - duration;
        var priorTo   = from;

        var priorOrderCount = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Paid && o.CreatedAt >= priorFrom && o.CreatedAt < priorTo, ct);

        var priorRevenue = 0m;
        if (priorOrderCount > 0)
        {
            var prior = await db.OrderItems
                .Where(i => i.Order.Status == OrderStatus.Paid
                         && i.Order.CreatedAt >= priorFrom && i.Order.CreatedAt < priorTo)
                .Select(i => new { LineTotal = i.Price * i.Quantity })
                .GroupBy(_ => 1)
                .Select(g => new { Revenue = g.Sum(x => x.LineTotal) })
                .FirstOrDefaultAsync(ct);
            priorRevenue = prior?.Revenue ?? 0m;
        }

        // Percentage change: null when prior period had zero orders (÷0 = undefined, not ∞).
        decimal? revenuePct    = priorRevenue    > 0 ? Math.Round((revenue    - priorRevenue)    / priorRevenue    * 100m, 1) : null;
        decimal? orderCountPct = priorOrderCount > 0 ? Math.Round((orderCount - priorOrderCount) / (decimal)priorOrderCount * 100m, 1) : null;

        return new ReportSummaryDto(
            revenue,
            orderCount,
            orderCount > 0 ? revenue / orderCount : 0m,
            itemsSold,
            revenuePct,
            orderCountPct);
    }

    public async Task<List<TopItemDto>> GetTopItemsAsync(DateTime from, DateTime to, int limit, CancellationToken ct = default)
    {
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
        var orderCounts = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to)
            .GroupBy(o => o.CreatedById)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        if (orderCounts.Count == 0) return [];

        var revenues = await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { CreatedById = i.Order.CreatedById, LineTotal = i.Price * i.Quantity })
            .GroupBy(x => x.CreatedById)
            .Select(g => new { UserId = g.Key, Revenue = g.Sum(x => x.LineTotal) })
            .ToDictionaryAsync(x => x.UserId, x => x.Revenue, ct);

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
                revenues.GetValueOrDefault(kv.Key, 0m)))
            .OrderByDescending(s => s.Revenue)
            .Take(limit)
            .ToList();
    }

    public async Task<List<RevenuePointDto>> GetRevenueTrendAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
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

        var revenueByDate = revenueRaw.ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Revenue);
        var countByDate   = countRaw  .ToDictionary(r => DateOnly.FromDateTime(r.Date), r => r.Count);

        var points = new List<RevenuePointDto>();
        for (var d = DateOnly.FromDateTime(from); d < DateOnly.FromDateTime(to); d = d.AddDays(1))
            points.Add(new RevenuePointDto(d, revenueByDate.GetValueOrDefault(d, 0m), countByDate.GetValueOrDefault(d, 0)));

        return points;
    }

    public async Task<List<HourlyPointDto>> GetHourlyBreakdownAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        // Group paid orders by hour-of-day. EF Core / Npgsql translates
        // o.CreatedAt.Hour → EXTRACT(HOUR FROM "CreatedAt") in PostgreSQL.
        var orderCountByHour = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= from && o.CreatedAt < to)
            .GroupBy(o => o.CreatedAt.Hour)
            .Select(g => new { Hour = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Hour, x => x.Count, ct);

        // Revenue per hour — flatten before GroupBy to avoid TransparentIdentifier.
        var revenueByHour = await db.OrderItems
            .Where(i => i.Order.Status == OrderStatus.Paid && i.Order.CreatedAt >= from && i.Order.CreatedAt < to)
            .Select(i => new { Hour = i.Order.CreatedAt.Hour, LineTotal = i.Price * i.Quantity })
            .GroupBy(x => x.Hour)
            .Select(g => new { Hour = g.Key, Revenue = g.Sum(x => x.LineTotal) })
            .ToDictionaryAsync(x => x.Hour, x => x.Revenue, ct);

        // Always return all 24 hours so the UI can render a consistent grid.
        return Enumerable.Range(0, 24)
            .Select(h => new HourlyPointDto(h, orderCountByHour.GetValueOrDefault(h, 0), revenueByHour.GetValueOrDefault(h, 0m)))
            .ToList();
    }
}
