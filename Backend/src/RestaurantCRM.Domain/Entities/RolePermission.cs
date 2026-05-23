using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class RolePermission
{
    public Guid RoleId { get; set; }
    public PermissionType Permission { get; set; }

    public Role? Role { get; set; }
}