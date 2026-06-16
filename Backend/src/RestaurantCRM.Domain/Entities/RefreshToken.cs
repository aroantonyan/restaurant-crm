using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// A long-lived, rotating credential that mints new short-lived access tokens
/// without forcing the user to sign in again.
///
/// Only the SHA-256 hash of the raw token is stored — the raw value lives solely
/// on the client, so a database leak can't be replayed. Each refresh rotates the
/// token (the presented one is revoked and a replacement issued); presenting an
/// already-revoked token signals theft and revokes the whole family for that user.
///
/// NOT an ITenantEntity: refresh happens before the tenant context exists, so this
/// table must be queryable without the global restaurant filter.
/// </summary>
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
