using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class MenuItemRecipeConfiguration : IEntityTypeConfiguration<MenuItemRecipe>
{
    public void Configure(EntityTypeBuilder<MenuItemRecipe> builder)
    {
        builder.HasKey(r => r.Id);

        // 18,3 to match Product.CurrentStock — keeps unit consistency in the math.
        builder.Property(r => r.Quantity).HasPrecision(18, 3);

        builder.HasOne(r => r.MenuItem)
            .WithMany()
            .HasForeignKey(r => r.MenuItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Product)
            .WithMany()
            .HasForeignKey(r => r.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // A menu item can list a given product at most once — the qty field
        // accumulates total usage, no need for duplicate rows.
        builder.HasIndex(r => new { r.MenuItemId, r.ProductId }).IsUnique();
    }
}
