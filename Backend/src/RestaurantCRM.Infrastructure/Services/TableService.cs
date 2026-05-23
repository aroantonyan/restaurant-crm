using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Tables;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class TableService(AppDbContext db, ITenantContext tenant, IRealtimeNotifier notifier) : ITableService
{
    public async Task<List<TableDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.Tables
            .OrderBy(t => t.Number)
            .Select(t => new TableDto(t.Id, t.Number, t.Capacity, t.Status.ToString()))
            .ToListAsync(ct);
    }

    public async Task<TableDto> CreateAsync(CreateTableRequest request, CancellationToken ct = default)
    {
        var exists = await db.Tables.AnyAsync(t => t.Number == request.Number, ct);
        if (exists) throw new InvalidOperationException($"Table {request.Number} already exists.");

        var table = new Table
        {
            RestaurantId = tenant.RestaurantId,
            Number = request.Number,
            Capacity = request.Capacity,
        };
        db.Tables.Add(table);
        await db.SaveChangesAsync(ct);

        await notifier.TableChanged(table.Id, ct);

        return new TableDto(table.Id, table.Number, table.Capacity, table.Status.ToString());
    }

    public async Task<TableDto> UpdateAsync(Guid id, UpdateTableRequest request, CancellationToken ct = default)
    {
        var table = await db.Tables.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Table not found.");

        var numberTaken = await db.Tables.AnyAsync(t => t.Number == request.Number && t.Id != id, ct);
        if (numberTaken) throw new InvalidOperationException($"Table {request.Number} already exists.");

        table.Number = request.Number;
        table.Capacity = request.Capacity;
        await db.SaveChangesAsync(ct);

        await notifier.TableChanged(table.Id, ct);

        return new TableDto(table.Id, table.Number, table.Capacity, table.Status.ToString());
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var table = await db.Tables.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException("Table not found.");

        var hasOpenOrders = await db.Orders.AnyAsync(o => o.TableId == id && o.Status == Domain.Enums.OrderStatus.Open, ct);
        if (hasOpenOrders) throw new InvalidOperationException("Cannot delete a table with open orders.");

        db.Tables.Remove(table);
        await db.SaveChangesAsync(ct);

        await notifier.TableChanged(id, ct);
    }
}
