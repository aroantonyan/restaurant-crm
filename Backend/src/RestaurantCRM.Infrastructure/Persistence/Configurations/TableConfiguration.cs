using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class TableConfiguration : IEntityTypeConfiguration<Table>
{
    public void Configure(EntityTypeBuilder<Table> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.VipAmount).HasPrecision(18, 2);

        builder.HasIndex(t => new { t.RestaurantId, t.Number }).IsUnique();
    }
}
