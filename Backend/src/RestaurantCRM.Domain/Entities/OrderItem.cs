using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class OrderItem : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid OrderId { get; set; }
    public Guid MenuItemId { get; set; }
    public string MenuItemName { get; set; } = string.Empty; // price snapshot at order time
    public decimal Price { get; set; }                       // price snapshot at order time
    public int Quantity { get; set; }
    public OrderItemStatus Status { get; set; } = OrderItemStatus.Pending;
    public string? Notes { get; set; }

    public Order Order { get; set; } = null!;
    public MenuItem MenuItemRef { get; set; } = null!;
}
