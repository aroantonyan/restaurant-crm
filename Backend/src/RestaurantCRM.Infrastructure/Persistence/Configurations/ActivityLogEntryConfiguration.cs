using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ActivityLogEntryConfiguration : IEntityTypeConfiguration<ActivityLogEntry>
{
    public void Configure(EntityTypeBuilder<ActivityLogEntry> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.UserName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Category).HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Action).IsRequired().HasMaxLength(50);
        builder.Property(e => e.EntityType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Description).IsRequired().HasMaxLength(500);
        builder.Property(e => e.IpAddress).HasMaxLength(50);

        // No FK on UserId — soft link, see entity XML comments. Users can be archived;
        // the audit trail outlives their account.

        // Primary read path: chronological browsing within a tenant.
        builder.HasIndex(e => new { e.RestaurantId, e.CreatedAt });
        // Secondary path: filter by category over time.
        builder.HasIndex(e => new { e.RestaurantId, e.Category, e.CreatedAt });
        // "What did user X do?" — accountability lookup.
        builder.HasIndex(e => new { e.RestaurantId, e.UserId, e.CreatedAt });
    }
}
