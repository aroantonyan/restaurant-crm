using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class Reservation : BaseEntity, ITenantEntity, ISoftDeleteEntity
{
    public Guid RestaurantId { get; set; }
    public Guid TableId { get; set; }
    public Guid CreatedById { get; set; }

    // Optional CRM link. When set, the reservation belongs to a known regular —
    // GuestName/Phone are still kept as a snapshot so the row stays readable
    // if the client is later renamed or archived.
    public Guid? ClientId { get; set; }
    public Client? Client { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public string? GuestPhone { get; set; }
    public int GuestCount { get; set; }

    // UTC. Mapped to `timestamptz` by the Npgsql provider.
    public DateTime StartAt { get; set; }
    public int DurationMinutes { get; set; } = 120;

    public ReservationStatus Status { get; set; } = ReservationStatus.Confirmed;
    public string? Notes { get; set; }

    // Soft delete: row stays for audit; default queries filter it out.
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Table Table { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;

    // Computed — convenient for conflict checks.
    public DateTime EndAt => StartAt.AddMinutes(DurationMinutes);
}
