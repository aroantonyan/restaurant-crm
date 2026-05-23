using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class UserPermission
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public PermissionType Permission { get; set; }
}
