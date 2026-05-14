using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Orders;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class OrderService(AppDbContext db) : IOrderService
{
    public async Task<List<OrderDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.Orders
            .Include(o => o.Table)
            .Include(o => o.CreatedBy)
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => ToDto(o))
            .ToListAsync(ct);
    }

    public async Task<OrderDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.CreatedBy)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Order not found.");
        return ToDto(order);
    }

    public async Task<OrderDto> CreateAsync(CreateOrderRequest request, Guid createdById, CancellationToken ct = default)
    {
        var table = await db.Tables.FirstOrDefaultAsync(t => t.Id == request.TableId, ct)
            ?? throw new KeyNotFoundException("Table not found.");

        var menuItemIds = request.Items.Select(i => i.MenuItemId).ToList();
        var menuItems = await db.MenuItems
            .Where(m => menuItemIds.Contains(m.Id))
            .ToListAsync(ct);

        var missing = menuItemIds.Except(menuItems.Select(m => m.Id)).ToList();
        if (missing.Count > 0) throw new KeyNotFoundException("One or more menu items not found.");

        var unavailable = menuItems.Where(m => !m.IsAvailable).Select(m => m.Name).ToList();
        if (unavailable.Count > 0)
            throw new InvalidOperationException($"Items not available: {string.Join(", ", unavailable)}");

        var order = new Order
        {
            RestaurantId = table.RestaurantId,
            TableId = table.Id,
            CreatedById = createdById,
            Items = request.Items.Select(i =>
            {
                var menuItem = menuItems.First(m => m.Id == i.MenuItemId);
                return new OrderItem
                {
                    RestaurantId = table.RestaurantId,
                    MenuItemId = menuItem.Id,
                    MenuItemName = menuItem.Name,
                    Price = menuItem.Price,
                    Quantity = i.Quantity,
                    Notes = i.Notes,
                };
            }).ToList(),
        };

        table.Status = TableStatus.Occupied;
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(order.Id, ct);
    }

    public async Task<OrderDto> AddItemAsync(Guid orderId, AddOrderItemRequest request, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.Status != OrderStatus.Open)
            throw new InvalidOperationException("Cannot add items to a closed order.");

        var menuItem = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == request.MenuItemId, ct)
            ?? throw new KeyNotFoundException("Menu item not found.");

        if (!menuItem.IsAvailable)
            throw new InvalidOperationException($"'{menuItem.Name}' is not available.");

        var item = new OrderItem
        {
            RestaurantId = order.RestaurantId,
            OrderId = order.Id,
            MenuItemId = menuItem.Id,
            MenuItemName = menuItem.Name,
            Price = menuItem.Price,
            Quantity = request.Quantity,
            Notes = request.Notes,
        };
        db.OrderItems.Add(item);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(orderId, ct);
    }

    public async Task<OrderDto> RemoveItemAsync(Guid orderId, Guid itemId, CancellationToken ct = default)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.Status != OrderStatus.Open)
            throw new InvalidOperationException("Cannot remove items from a closed order.");

        var item = await db.OrderItems.FirstOrDefaultAsync(i => i.Id == itemId && i.OrderId == orderId, ct)
            ?? throw new KeyNotFoundException("Order item not found.");

        db.OrderItems.Remove(item);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(orderId, ct);
    }

    public async Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken ct = default)
    {
        var order = await db.Orders.Include(o => o.Table)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        if (!Enum.TryParse<OrderStatus>(request.Status, out var newStatus))
            throw new ArgumentException($"Invalid order status: {request.Status}");

        order.Status = newStatus;

        if (newStatus is OrderStatus.Paid or OrderStatus.Cancelled)
        {
            var hasOtherOpenOrders = await db.Orders
                .AnyAsync(o => o.TableId == order.TableId && o.Id != id && o.Status == OrderStatus.Open, ct);
            if (!hasOtherOpenOrders)
                order.Table.Status = TableStatus.Free;
        }

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<OrderDto> UpdateItemStatusAsync(Guid orderId, Guid itemId, UpdateOrderItemStatusRequest request, CancellationToken ct = default)
    {
        var item = await db.OrderItems.FirstOrDefaultAsync(i => i.Id == itemId && i.OrderId == orderId, ct)
            ?? throw new KeyNotFoundException("Order item not found.");

        if (!Enum.TryParse<OrderItemStatus>(request.Status, out var newStatus))
            throw new ArgumentException($"Invalid item status: {request.Status}");

        item.Status = newStatus;
        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(orderId, ct);
    }

    private static OrderDto ToDto(Order o) => new(
        o.Id,
        o.TableId,
        o.Table.Number,
        o.Status.ToString(),
        $"{o.CreatedBy.FirstName} {o.CreatedBy.LastName}",
        o.CreatedAt,
        o.Items.Select(i => new OrderItemDto(
            i.Id, i.MenuItemId, i.MenuItemName, i.Price, i.Quantity, i.Status.ToString(), i.Notes
        )).ToList(),
        o.Items.Sum(i => i.Price * i.Quantity)
    );
}
