using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Category).HasMaxLength(100);
        builder.Property(p => p.Notes).HasMaxLength(1000);
        builder.Property(p => p.Unit).HasConversion<string>().HasMaxLength(20);

        // 18 digits, 3 decimals — supports 1g / 1ml resolution up to 999,999,999,999 kg.
        builder.Property(p => p.CurrentStock).HasPrecision(18, 3);
        builder.Property(p => p.LowStockThreshold).HasPrecision(18, 3);

        builder.Property(p => p.IsArchived).HasDefaultValue(false);

        // Optimistic concurrency via Postgres' xmin — protects the read-modify-write
        // on CurrentStock from lost updates when two paid orders deduct the same
        // ingredient simultaneously (audit H1).
        builder.Property<uint>("xmin").IsRowVersion().HasColumnName("xmin");

        builder.HasMany(p => p.Movements)
            .WithOne(m => m.Product)
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Common queries: scope by tenant + name lookup, and category filtering.
        builder.HasIndex(p => new { p.RestaurantId, p.Name });
        builder.HasIndex(p => new { p.RestaurantId, p.Category });
    }
}
