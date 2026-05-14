using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class Table : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public int Number { get; set; }
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Free;

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<Order> Orders { get; set; } = [];
}
