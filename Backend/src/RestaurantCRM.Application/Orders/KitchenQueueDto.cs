namespace RestaurantCRM.Application.Orders;

/// <summary>
/// A single line on the kitchen display: one order-item from an Open order whose
/// status is still on the kitchen side of the pipeline (Pending / Preparing /
/// Ready). Served items drop off because the waiter has taken them out.
///
/// `CreatedAt` is shipped raw — the client renders the elapsed-time badge and
/// updates it every second locally so we don't poll the API once per second.
/// </summary>
public record KitchenQueueItemDto(
    Guid Id,
    Guid OrderId,
    string MenuItemName,
    int Quantity,
    string? Notes,
    string Status,
    int TableNumber,
    Guid TableId,
    DateTime CreatedAt
);
