using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.FullName).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Phone).HasMaxLength(30);
        builder.Property(c => c.Email).HasMaxLength(256);
        builder.Property(c => c.Notes).HasMaxLength(1000);

        builder.Property(c => c.LoyaltyType).HasConversion<string>().HasMaxLength(20);
        builder.Property(c => c.DepositBalance).HasPrecision(18, 2);
        // Rate is a percentage in 0–100 range; 2 decimals supports e.g. 7.50%.
        builder.Property(c => c.LoyaltyRate).HasPrecision(5, 2);

        builder.Property(c => c.IsArchived).HasDefaultValue(false);

        // Optimistic concurrency via Postgres' xmin — DepositBalance is a
        // denormalized cache of the ledger sum; without this two concurrent
        // ops (payment + deposit, or two paid orders) lose updates and the
        // cache drifts from SUM(ClientTransactions.Amount) (audit H2).
        builder.Property<uint>("xmin").IsRowVersion().HasColumnName("xmin");

        builder.HasMany(c => c.Transactions)
            .WithOne(t => t.Client)
            .HasForeignKey(t => t.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // Lookup by phone is the dominant query path (waiters identify regulars by phone).
        // Combined with restaurant scope, this is the index most reads will hit.
        builder.HasIndex(c => new { c.RestaurantId, c.Phone });
        builder.HasIndex(c => new { c.RestaurantId, c.FullName });
    }
}
