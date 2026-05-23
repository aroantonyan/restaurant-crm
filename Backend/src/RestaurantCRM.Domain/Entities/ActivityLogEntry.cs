using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// Append-only audit row capturing a business-meaningful event in the system.
///
/// Design contract: this entity is NEVER updated or deleted via application code.
/// There are no PUT or DELETE endpoints over it. Direct DB edits should be
/// detectable via DB-level audit triggers (out of scope for v1).
///
/// `UserName` is a snapshot of the actor's display name at the time of the event,
/// so the audit trail remains readable even if the user is later renamed or
/// deactivated. `UserId` is a soft link (no FK) for the same reason — historical
/// integrity matters more than referential constraints for an audit log.
///
/// `EntityId` is nullable: present for events that target a specific record
/// ("Order #abc cancelled"), null for module-wide events ("User logged in").
///
/// `Description` is the human-readable summary shown in the UI. It is pre-formatted
/// at write time by the calling service — readers don't need module-specific
/// knowledge to render it.
/// </summary>
public class ActivityLogEntry : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }

    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;

    public ActivityCategory Category { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }

    public string Description { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
}
