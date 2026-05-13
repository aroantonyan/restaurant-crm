using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Domain.Entities;

public class Role : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
}
