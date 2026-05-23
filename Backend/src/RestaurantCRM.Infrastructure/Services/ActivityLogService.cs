using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Records and queries the system audit trail.
///
/// LogAsync follows the "best-effort never throws" contract: every call site can
/// invoke it without try/catch, and a logging failure (DB down, validator bug,
/// whatever) will never break a user action. Failures are recorded to Serilog —
/// the operator can detect missing entries by correlation with the operational
/// log if it ever matters.
/// </summary>
public class ActivityLogService(
    AppDbContext db,
    ITenantContext tenant,
    ILogger<ActivityLogService> logger) : IActivityLogService
{
    public async Task<List<ActivityLogEntryDto>> GetAsync(
        DateTime from,
        DateTime to,
        ActivityCategory? category,
        Guid? userId,
        string? entityType,
        int limit,
        CancellationToken ct = default)
    {
        var query = db.ActivityLogEntries
            .Where(e => e.CreatedAt >= from && e.CreatedAt < to);

        if (category.HasValue) query = query.Where(e => e.Category == category.Value);
        if (userId.HasValue)   query = query.Where(e => e.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(e => e.EntityType == entityType);

        var rows = await query
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(e => new ActivityLogEntryDto(
            e.Id, e.UserId, e.UserName, e.Category, e.Action, e.EntityType, e.EntityId,
            e.Description, e.CreatedAt
        )).ToList();
    }

    public async Task LogAsync(
        Guid actingUserId,
        ActivityCategory category,
        string action,
        string entityType,
        Guid? entityId,
        string description,
        CancellationToken ct = default)
    {
        if (!tenant.HasTenant)
        {
            // Auth endpoints can call this without a tenant — drop to Serilog only.
            logger.LogInformation(
                "ActivityLog skipped (no tenant): {Category}/{Action} {EntityType}#{EntityId}: {Description}",
                category, action, entityType, entityId, description);
            return;
        }

        try
        {
            var userName = await ResolveUserNameAsync(actingUserId, ct);
            db.ActivityLogEntries.Add(new ActivityLogEntry
            {
                RestaurantId = tenant.RestaurantId,
                UserId = actingUserId == Guid.Empty ? null : actingUserId,
                UserName = userName,
                Category = category,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Description = description.Length > 500 ? description[..500] : description,
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Critical: never bubble up. Audit logging must never break a user action.
            logger.LogWarning(ex,
                "Failed to write ActivityLog entry: {Category}/{Action} {EntityType}#{EntityId}",
                category, action, entityType, entityId);
        }
    }

    private async Task<string> ResolveUserNameAsync(Guid userId, CancellationToken ct)
    {
        if (userId == Guid.Empty) return "System";

        // Already-tracked entity wins — auth pipeline + service operations both load
        // the calling user into the change tracker, so most LogAsync calls hit a cache.
        var tracked = db.Users.Local.FirstOrDefault(u => u.Id == userId);
        if (tracked is not null) return tracked.FullName;

        var name = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.FirstName + " " + u.LastName)
            .FirstOrDefaultAsync(ct);
        return name ?? "Unknown";
    }
}
