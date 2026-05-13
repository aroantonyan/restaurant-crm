using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Domain.Entities;

public class Restaurant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string Currency { get; set; } = "AMD";
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Role> Roles { get; set; } = [];
}
