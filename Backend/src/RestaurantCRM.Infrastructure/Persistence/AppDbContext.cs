using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
    : DbContext(options)
{
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Table> Tables => Set<Table>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<MenuItemRecipe> MenuItemRecipes => Set<MenuItemRecipe>();
    public DbSet<CashRegisterTransaction> CashRegisterTransactions => Set<CashRegisterTransaction>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<ClientTransaction> ClientTransactions => Set<ClientTransaction>();
    public DbSet<ActivityLogEntry> ActivityLogEntries => Set<ActivityLogEntry>();
    public DbSet<Shift> Shifts => Set<Shift>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyDefaultFilters(modelBuilder);
    }

    private void ApplyDefaultFilters(ModelBuilder modelBuilder)
    {
        // Applies tenant scoping + soft-delete in a single composed filter per entity.
        // Re-evaluated per query, so tenantContext.RestaurantId reflects the current request.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            modelBuilder.Entity(entityType.ClrType).ApplyDefaultFilters(tenantContext);
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
