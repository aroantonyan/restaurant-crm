namespace RestaurantCRM.Application.Orders;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllAsync(CancellationToken ct = default);
    Task<OrderDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<OrderDto> CreateAsync(CreateOrderRequest request, Guid createdById, CancellationToken ct = default);
    Task<OrderDto> AddItemAsync(Guid orderId, AddOrderItemRequest request, CancellationToken ct = default);
    Task<OrderDto> RemoveItemAsync(Guid orderId, Guid itemId, CancellationToken ct = default);
    Task<OrderDto> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request, CancellationToken ct = default);
    Task<OrderDto> UpdateItemStatusAsync(Guid orderId, Guid itemId, UpdateOrderItemStatusRequest request, CancellationToken ct = default);
}
