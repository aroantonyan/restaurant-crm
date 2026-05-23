using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<Shift>
{
    public void Configure(EntityTypeBuilder<Shift> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.RoleForShift).HasMaxLength(50);
        builder.Property(s => s.Notes).HasMaxLength(500);

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Computed — not persisted.
        builder.Ignore(s => s.Duration);

        // Two primary read paths:
        //   • Manager week view: load all shifts in a tenant within a date range.
        //   • Personal view: load this employee's shifts in a date range.
        builder.HasIndex(s => new { s.RestaurantId, s.StartAt });
        builder.HasIndex(s => new { s.UserId, s.StartAt });
    }
}
