using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// A scheduled work shift for one employee.
///
/// Storage discipline:
///   • StartAt / EndAt are UTC. Frontend renders in the device's local timezone.
///   • RoleForShift is denormalized text — the role the employee is filling THIS
///     shift, which may differ from their main role (e.g., a Waiter covering
///     the bar one night). Stored as a free string for v1; could become an enum
///     later if we want stricter role taxonomy.
///   • Status defaults to Scheduled; Cancelled rows are kept for audit/labor reports.
///
/// Industry pattern (7shifts / Deputy / Sling): a single shift table indexed
/// by (RestaurantId, StartAt) for week queries and (UserId, StartAt) for
/// personal calendar views — both indexes added in the EF configuration.
/// </summary>
public class Shift : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }

    // Assigned employee. Required — no "open shifts" in v1 (queueing them for
    // employees to claim is a v2 feature).
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // UTC datetimes. EndAt must be > StartAt (enforced in service).
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }

    // Optional role-for-this-shift. Lets a Waiter cover the bar without changing
    // their main role. Null = use the user's main role.
    public string? RoleForShift { get; set; }

    // Optional manager-facing free text ("trial shift", "doubles with X").
    public string? Notes { get; set; }

    public ShiftStatus Status { get; set; } = ShiftStatus.Scheduled;

    // The manager (or whoever has ManageSchedules) who created the row.
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    // Computed — convenient for UI.
    public TimeSpan Duration => EndAt - StartAt;
}
