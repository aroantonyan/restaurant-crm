using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(m => m.Reason).HasMaxLength(500);

        builder.Property(m => m.QuantityChange).HasPrecision(18, 3);
        builder.Property(m => m.QuantityAfter).HasPrecision(18, 3);

        builder.HasOne(m => m.CreatedBy)
            .WithMany()
            .HasForeignKey(m => m.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Movement history is queried per-product in descending time order.
        builder.HasIndex(m => new { m.ProductId, m.CreatedAt });
    }
}
