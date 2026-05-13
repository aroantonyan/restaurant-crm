using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class User : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid RoleId { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FatherName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public long? TelegramUserId { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;

    public string FullName => $"{FirstName} {LastName} {FatherName}".Trim();

    public Restaurant Restaurant { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
