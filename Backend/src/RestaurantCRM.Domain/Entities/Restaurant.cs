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

    // Denormalized cash drawer counter kept in sync with the signed sum of
    // CashRegisterTransaction.Amount rows whose Method == Cash, inside the
    // same SaveChangesAsync as each transaction row. Allows O(1) balance reads.
    public decimal CashBalance { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Role> Roles { get; set; } = [];
    public ICollection<MenuCategory> MenuCategories { get; set; } = [];
    public ICollection<Table> Tables { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}
