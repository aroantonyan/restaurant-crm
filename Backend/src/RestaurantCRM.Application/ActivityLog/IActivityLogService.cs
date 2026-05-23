using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.ActivityLog;

public interface IActivityLogService
{
    Task<List<ActivityLogEntryDto>> GetAsync(
        DateTime from,
        DateTime to,
        ActivityCategory? category,
        Guid? userId,
        string? entityType,
        int limit,
        CancellationToken ct = default);

    /// <summary>
    /// Best-effort write of an audit-log entry. Implementation MUST NOT throw —
    /// a logging failure must never break the caller's business operation.
    /// Errors are swallowed and logged via Serilog at warning level.
    ///
    /// The acting user's display name is resolved internally from <paramref name="actingUserId"/>
    /// (cached via EF's change tracker — usually free since auth pipeline already loaded it).
    /// Pass Guid.Empty for system-initiated events (e.g. seeded data, scheduled jobs).
    /// </summary>
    Task LogAsync(
        Guid actingUserId,
        ActivityCategory category,
        string action,
        string entityType,
        Guid? entityId,
        string description,
        CancellationToken ct = default);
}
