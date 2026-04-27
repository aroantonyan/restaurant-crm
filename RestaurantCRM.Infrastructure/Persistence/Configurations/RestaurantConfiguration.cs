using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class RestaurantConfiguration : IEntityTypeConfiguration<Restaurant>
{
    public void Configure(EntityTypeBuilder<Restaurant> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name).IsRequired().HasMaxLength(200);
        builder.Property(r => r.LegalName).IsRequired().HasMaxLength(300);
        builder.Property(r => r.Currency).IsRequired().HasMaxLength(10).HasDefaultValue("AMD");
        builder.Property(r => r.Address).HasMaxLength(500);
        builder.Property(r => r.Phone).HasMaxLength(30);
        builder.Property(r => r.LogoUrl).HasMaxLength(1000);

        builder.HasMany(r => r.Users)
            .WithOne(u => u.Restaurant)
            .HasForeignKey(u => u.RestaurantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Roles)
            .WithOne(role => role.Restaurant)
            .HasForeignKey(role => role.RestaurantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
