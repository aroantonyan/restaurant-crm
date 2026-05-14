using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class Order : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid TableId { get; set; }
    public Guid CreatedById { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Open;

    public Restaurant Restaurant { get; set; } = null!;
    public Table Table { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<OrderItem> Items { get; set; } = [];
}
