using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Domain.Entities;

namespace RestaurantCRM.Infrastructure.Persistence.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.GuestName).IsRequired().HasMaxLength(200);
        builder.Property(r => r.GuestPhone).HasMaxLength(30);
        builder.Property(r => r.Notes).HasMaxLength(500);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(50);
        builder.Property(r => r.IsDeleted).HasDefaultValue(false);

        builder.HasOne(r => r.Table)
            .WithMany()
            .HasForeignKey(r => r.TableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.CreatedBy)
            .WithMany()
            .HasForeignKey(r => r.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Optional CRM link. Restrict deletes so an archived client can't orphan
        // historical reservations.
        builder.HasOne(r => r.Client)
            .WithMany()
            .HasForeignKey(r => r.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // Computed property — not persisted.
        builder.Ignore(r => r.EndAt);

        // Used for the conflict check and date-range queries.
        builder.HasIndex(r => new { r.TableId, r.StartAt });
        builder.HasIndex(r => new { r.RestaurantId, r.StartAt });
    }
}
