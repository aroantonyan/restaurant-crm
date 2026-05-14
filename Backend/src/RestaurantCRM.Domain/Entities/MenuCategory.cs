using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Domain.Entities;

public class MenuCategory : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<MenuItem> Items { get; set; } = [];
}
