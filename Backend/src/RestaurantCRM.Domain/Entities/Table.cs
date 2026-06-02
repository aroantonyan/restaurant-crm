using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class Table : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public int Number { get; set; }
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Free;

    // VIP tables are a display-only label + amount (e.g. a cover charge the
    // cashier collects manually). They do not alter the bill math.
    public bool IsVip { get; set; }
    public decimal VipAmount { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = [];
}
