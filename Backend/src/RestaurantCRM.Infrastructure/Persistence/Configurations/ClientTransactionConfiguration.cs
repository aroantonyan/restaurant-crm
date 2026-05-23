using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ClientTransactionConfiguration : IEntityTypeConfiguration<ClientTransaction>
{
    public void Configure(EntityTypeBuilder<ClientTransaction> builder)
    {
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(t => t.Amount).HasPrecision(18, 2);
        builder.Property(t => t.BalanceAfter).HasPrecision(18, 2);
        builder.Property(t => t.Reason).HasMaxLength(500);

        builder.HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Order)
            .WithMany()
            .HasForeignKey(t => t.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        // History is queried per-client in reverse-time order.
        builder.HasIndex(t => new { t.ClientId, t.CreatedAt });
    }
}
