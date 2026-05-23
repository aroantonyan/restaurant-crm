namespace RestaurantCRM.Application.Orders;

public record OrderDto(
    Guid Id,
    Guid TableId,
    int TableNumber,
    string Status,
    string CreatedBy,
    DateTime CreatedAt,
    List<OrderItemDto> Items,
    decimal Total,
    // Set when the order has been paid; null otherwise.
    string? PaymentMethod = null,
    // Optional linked client for loyalty / deposit billing.
    Guid? ClientId = null,
    string? ClientName = null
);

public record OrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    decimal Price,
    int Quantity,
    string Status,
    string? Notes
);

public record CreateOrderRequest(Guid TableId, List<AddOrderItemRequest> Items);

public record AddOrderItemRequest(Guid MenuItemId, int Quantity, string? Notes = null);

// Status is always "Paid" here (cancellation has its own endpoint).
// PaymentMethod is required when status is Paid — the validator enforces it.
public record UpdateOrderStatusRequest(string Status, string? PaymentMethod = null);

public record UpdateOrderItemStatusRequest(string Status);
