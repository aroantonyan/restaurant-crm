using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class CashRegisterTransactionConfiguration : IEntityTypeConfiguration<CashRegisterTransaction>
{
    public void Configure(EntityTypeBuilder<CashRegisterTransaction> builder)
    {
        builder.HasKey(t => t.Id);

        // Enums stored as strings — readable in raw SQL queries and stable across reorders.
        builder.Property(t => t.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(t => t.Method).HasConversion<string>().HasMaxLength(20);

        builder.Property(t => t.Amount).HasPrecision(18, 2);
        builder.Property(t => t.BalanceAfter).HasPrecision(18, 2);
        builder.Property(t => t.Reason).HasMaxLength(500);

        // Order link is optional (manual ops have none). Restrict so an order with
        // payment history can't be deleted accidentally — even via direct SQL it would error.
        builder.HasOne(t => t.Order)
            .WithMany()
            .HasForeignKey(t => t.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // The cash register dashboard pages query by tenant + time range, often filtered
        // by method or type. The composite index covers the common KPI summary path.
        builder.HasIndex(t => new { t.RestaurantId, t.CreatedAt });
    }
}
