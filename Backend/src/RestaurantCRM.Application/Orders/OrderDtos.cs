namespace RestaurantCRM.Application.Orders;

public record OrderDto(
    Guid Id,
    Guid TableId,
    int TableNumber,
    string Status,
    string CreatedBy,
    DateTime CreatedAt,
    List<OrderItemDto> Items,
    decimal Total
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

public record UpdateOrderStatusRequest(string Status);

public record UpdateOrderItemStatusRequest(string Status);
