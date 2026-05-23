using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.CashRegister;
using RestaurantCRM.Application.Clients;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Inventory;
using RestaurantCRM.Application.Orders;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class OrderService(
    AppDbContext db,
    ITenantContext tenant,
    IRealtimeNotifier notifier,
    IInventoryService inventory,
    ICashRegisterService cashRegister,
    IClientService clients,
    IActivityLogService activityLog) : IOrderService
{
    public async Task<List<OrderDto>> GetAllAsync(CancellationToken ct = default)
    {
        // Always include every Open order (long-running tables) but cap closed orders
        // to the last 7 days. Without this, the list grows unbounded over time and
        // every page load pulls the entire history.
        var cutoff = DateTime.UtcNow.AddDays(-7);
        return await db.Orders
            .Include(o => o.Table)
            .Include(o => o.CreatedBy)
            .Include(o => o.Items)
            .Include(o => o.Client)
            .Where(o => o.Status == OrderStatus.Open || o.CreatedAt >= cutoff)
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
            .Include(o => o.Client)
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
            RestaurantId = tenant.RestaurantId,
            TableId = table.Id,
            CreatedById = createdById,
            Items = request.Items.Select(i =>
            {
                var menuItem = menuItems.First(m => m.Id == i.MenuItemId);
                return new OrderItem
                {
                    RestaurantId = tenant.RestaurantId,
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

        await activityLog.LogAsync(createdById, ActivityCategory.Order, "Created", nameof(Order), order.Id,
            $"Order opened on table #{table.Number} with {order.Items.Count} item(s)", ct);

        // Push: a new order exists, and the table flipped to Occupied.
        await notifier.OrderChanged(order.Id, ct);
        await notifier.TableChanged(table.Id, ct);

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
            RestaurantId = tenant.RestaurantId,
            OrderId = order.Id,
            MenuItemId = menuItem.Id,
            MenuItemName = menuItem.Name,
            Price = menuItem.Price,
            Quantity = request.Quantity,
            Notes = request.Notes,
        };
        db.OrderItems.Add(item);
        await db.SaveChangesAsync(ct);

        await notifier.OrderChanged(orderId, ct);

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

        await notifier.OrderChanged(orderId, ct);

        return await GetByIdAsync(orderId, ct);
    }

    public async Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, Guid actingUserId, CancellationToken ct = default)
    {
        // The validator already enforces "Paid" + a valid PaymentMethod.
        // Parse the method string once here so TransitionStatusAsync stays typed.
        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, out var method))
            throw new ArgumentException($"Invalid payment method: {request.PaymentMethod}");

        return await TransitionStatusAsync(id, OrderStatus.Paid, actingUserId, method, ct);
    }

    public async Task<OrderDto> CancelAsync(Guid id, Guid actingUserId, CancellationToken ct = default)
    {
        // Cancelled orders do not deduct stock or record a payment — but the canceller
        // is captured via actingUserId so the audit log can attribute the void.
        return await TransitionStatusAsync(id, OrderStatus.Cancelled, actingUserId, null, ct);
    }

    private async Task<OrderDto> TransitionStatusAsync(Guid id, OrderStatus target, Guid actingUserId, PaymentMethod? method, CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        if (order.Status != OrderStatus.Open)
            throw new InvalidOperationException("Only Open orders can change status.");

        order.Status = target;

        // Auto-deduct inventory + record cash payment + (optionally) charge client deposit
        // and credit cashback. All share the same SaveChangesAsync as the status change,
        // so they commit atomically — a failure in any one rolls back the whole transition.
        if (target == OrderStatus.Paid)
        {
            if (method is null)
                throw new InvalidOperationException("Payment method is required when paying an order.");

            // Paying with the client's deposit balance requires a client linked to the order.
            if (method == PaymentMethod.Deposit && order.ClientId is null)
                throw new InvalidOperationException("Deposit payment requires a client to be assigned to the order.");

            order.PaymentMethod = method;

            if (order.Items.Count > 0)
                await StageRecipeDeductionsAsync(order, actingUserId, ct);

            // Snapshot total at payment time.
            var total = order.Items.Sum(i => i.Price * i.Quantity);

            // 1. Record on the cash register ledger (Deposit method is logged but doesn't move drawer).
            await cashRegister.StageOrderPaymentAsync(order.Id, total, method.Value, actingUserId, ct);

            // 2. If paid via the client's deposit, debit their account.
            if (method == PaymentMethod.Deposit)
                await clients.StageOrderPaymentAsync(order.ClientId!.Value, order.Id, total, actingUserId, ct);

            // 3. Cashback applies for every payment method EXCEPT Deposit itself
            //    (preventing the arbitrage where spending deposit also earns cashback,
            //    which would let a balance regenerate itself perpetually).
            if (order.ClientId is not null && method != PaymentMethod.Deposit)
                await clients.StageCashbackAsync(order.ClientId.Value, order.Id, total, actingUserId, ct);
        }

        // If no other order keeps the table busy, release it.
        var hasOtherOpenOrders = await db.Orders
            .AnyAsync(o => o.TableId == order.TableId && o.Id != id && o.Status == OrderStatus.Open, ct);

        var tableFreed = false;
        if (!hasOtherOpenOrders)
        {
            order.Table.Status = TableStatus.Free;
            tableFreed = true;
        }

        await db.SaveChangesAsync(ct);

        // Audit log AFTER the main op committed — best-effort, never blocks.
        // Cancellation is the security-critical case: cash voids and refunds happen here.
        var shortId = order.Id.ToString()[..8];
        if (target == OrderStatus.Paid)
        {
            var orderTotal = order.Items.Sum(i => i.Price * i.Quantity);
            await activityLog.LogAsync(actingUserId, ActivityCategory.Order, "Paid", nameof(Order), order.Id,
                $"Order #{shortId} paid via {method} — total {orderTotal:N2}", ct);
        }
        else if (target == OrderStatus.Cancelled)
        {
            // Pass tenant's current user — CancelAsync passes Guid.Empty since
            // the controller path doesn't thread it. Falls back to "System".
            await activityLog.LogAsync(actingUserId, ActivityCategory.Order, "Cancelled", nameof(Order), order.Id,
                $"Order #{shortId} cancelled", ct);
        }

        await notifier.OrderChanged(id, ct);
        if (tableFreed) await notifier.TableChanged(order.TableId, ct);

        return await GetByIdAsync(id, ct);
    }

    /// <summary>
    /// Looks up each menu item's recipe and stages Sale movements deducting
    /// `recipeQty × itemQty` from each ingredient. Menu items without a recipe
    /// are silently skipped — restaurants commonly sell things that aren't tracked
    /// (e.g., bottled drinks). One realtime notification per affected product so
    /// the warehouse view refreshes live.
    /// </summary>
    private async Task StageRecipeDeductionsAsync(Order order, Guid actingUserId, CancellationToken ct)
    {
        var menuItemIds = order.Items.Select(i => i.MenuItemId).Distinct().ToList();

        var recipeRows = await db.MenuItemRecipes
            .Where(r => menuItemIds.Contains(r.MenuItemId))
            .ToListAsync(ct);
        if (recipeRows.Count == 0) return;

        var recipesByMenuItem = recipeRows
            .GroupBy(r => r.MenuItemId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var deductions = new List<SaleDeduction>();
        foreach (var item in order.Items)
        {
            if (!recipesByMenuItem.TryGetValue(item.MenuItemId, out var ingredients)) continue;
            foreach (var ing in ingredients)
                deductions.Add(new SaleDeduction(ing.ProductId, ing.Quantity * item.Quantity));
        }

        if (deductions.Count == 0) return;

        var depletedProductIds = await inventory.StageSaleDeductionsAsync(
            deductions,
            actingUserId,
            $"Order #{order.Id.ToString()[..8]}",
            ct);

        // Auto-86: any menu item that uses a depleted product (and is still marked
        // available) gets flipped to unavailable in the same transaction. Re-enabling
        // is intentionally manual — the kitchen confirms once the new delivery is
        // verified and prepped. Matches Toast / Square Restaurants behavior.
        var autoDisabledItemIds = new List<Guid>();
        if (depletedProductIds.Count > 0)
        {
            var menuItemsToDisable = await db.MenuItems
                .Where(i => i.IsAvailable && db.MenuItemRecipes
                    .Any(r => r.MenuItemId == i.Id && depletedProductIds.Contains(r.ProductId)))
                .ToListAsync(ct);

            foreach (var item in menuItemsToDisable)
            {
                item.IsAvailable = false;
                autoDisabledItemIds.Add(item.Id);
            }
        }

        // Realtime fan-out so warehouse + menu pages refresh. Notifications happen
        // after the outer SaveChangesAsync committed the deductions; doing them here
        // is fine — clients refetch via REST, so an early ping is at worst a no-op.
        foreach (var productId in deductions.Select(d => d.ProductId).Distinct())
            await notifier.ProductChanged(productId, ct);

        foreach (var itemId in autoDisabledItemIds)
            await notifier.MenuItemChanged(itemId, ct);
    }

    public async Task<OrderDto> UpdateItemStatusAsync(Guid orderId, Guid itemId, UpdateOrderItemStatusRequest request, CancellationToken ct = default)
    {
        var item = await db.OrderItems.FirstOrDefaultAsync(i => i.Id == itemId && i.OrderId == orderId, ct)
            ?? throw new KeyNotFoundException("Order item not found.");

        if (!Enum.TryParse<OrderItemStatus>(request.Status, out var newStatus))
            throw new ArgumentException($"Invalid item status: {request.Status}");

        item.Status = newStatus;
        await db.SaveChangesAsync(ct);

        await notifier.OrderChanged(orderId, ct);

        return await GetByIdAsync(orderId, ct);
    }

    public async Task<OrderDto> AssignClientAsync(Guid orderId, Guid? clientId, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .Include(o => o.Table)
            .Include(o => o.CreatedBy)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found.");

        // Only open orders can have their client changed. A paid order is a closed
        // accounting record — re-attribution would orphan its existing payment row.
        if (order.Status != OrderStatus.Open)
            throw new InvalidOperationException("Only open orders can be re-assigned.");

        if (clientId is not null)
        {
            var clientExists = await db.Clients.AnyAsync(c => c.Id == clientId.Value && !c.IsArchived, ct);
            if (!clientExists) throw new KeyNotFoundException("Client not found.");
        }

        order.ClientId = clientId;
        await db.SaveChangesAsync(ct);

        await notifier.OrderChanged(orderId, ct);
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
        o.Items.Sum(i => i.Price * i.Quantity),
        o.PaymentMethod?.ToString(),
        o.ClientId,
        o.Client?.FullName
    );
}
