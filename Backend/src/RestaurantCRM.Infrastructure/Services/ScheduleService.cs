using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Schedule;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Work-shift scheduling.
///
/// Conflict detection (overlap check) follows the standard half-open interval
/// rule: two shifts A and B overlap iff A.start &lt; B.end AND A.end &gt; B.start.
/// Cancelled shifts never block scheduling — they're kept only for audit.
/// </summary>
public class ScheduleService(
    AppDbContext db,
    ITenantContext tenant,
    IRealtimeNotifier notifier,
    IActivityLogService activityLog) : IScheduleService
{
    public async Task<List<ShiftDto>> GetAsync(DateTime from, DateTime to, Guid? userId, CancellationToken ct = default)
    {
        var query = db.Shifts
            .Include(s => s.User).ThenInclude(u => u.Role)
            .Where(s => s.StartAt < to && s.EndAt > from);

        if (userId.HasValue) query = query.Where(s => s.UserId == userId.Value);

        var shifts = await query
            .OrderBy(s => s.StartAt)
            .ToListAsync(ct);

        return shifts.Select(ToDto).ToList();
    }

    public async Task<ShiftDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var shift = await db.Shifts
            .Include(s => s.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException("Shift not found.");
        return ToDto(shift);
    }

    public async Task<ShiftDto> CreateAsync(CreateShiftRequest request, Guid actingUserId, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
            ?? throw new KeyNotFoundException("Employee not found.");

        if (user.Status == UserStatus.Inactive)
            throw new InvalidOperationException("Cannot schedule an inactive employee.");

        var startAt = EnsureUtc(request.StartAt);
        var endAt = EnsureUtc(request.EndAt);

        await EnsureNoOverlapAsync(request.UserId, startAt, endAt, excludeId: null, ct);

        var shift = new Shift
        {
            RestaurantId = tenant.RestaurantId,
            UserId = user.Id,
            StartAt = startAt,
            EndAt = endAt,
            RoleForShift = string.IsNullOrWhiteSpace(request.RoleForShift) ? null : request.RoleForShift.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = ShiftStatus.Scheduled,
            CreatedById = actingUserId,
        };
        db.Shifts.Add(shift);
        await db.SaveChangesAsync(ct);

        shift.User = user;

        await activityLog.LogAsync(actingUserId, ActivityCategory.Staff, "ShiftCreated", nameof(Shift), shift.Id,
            $"Shift scheduled for {user.FullName}: {shift.StartAt:yyyy-MM-dd HH:mm}–{shift.EndAt:HH:mm}", ct);

        await notifier.ScheduleChanged(shift.UserId, ct);

        return ToDto(shift);
    }

    public async Task<ShiftDto> UpdateAsync(Guid id, UpdateShiftRequest request, Guid actingUserId, CancellationToken ct = default)
    {
        var shift = await db.Shifts
            .Include(s => s.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException("Shift not found.");

        // Re-assigning to a different employee — verify they exist + are active.
        if (shift.UserId != request.UserId)
        {
            var newUser = await db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
                ?? throw new KeyNotFoundException("Employee not found.");
            if (newUser.Status == UserStatus.Inactive)
                throw new InvalidOperationException("Cannot schedule an inactive employee.");

            shift.UserId = newUser.Id;
            shift.User = newUser;
        }

        var startAt = EnsureUtc(request.StartAt);
        var endAt = EnsureUtc(request.EndAt);

        // Only check overlap against ACTIVE shifts — moving a Cancelled shift back
        // to Scheduled must still pass the conflict check; doing it on Cancelled
        // updates lets a manager pre-stage a replacement without false collisions.
        if (request.Status == ShiftStatus.Scheduled)
            await EnsureNoOverlapAsync(shift.UserId, startAt, endAt, excludeId: shift.Id, ct);

        shift.StartAt = startAt;
        shift.EndAt = endAt;
        shift.RoleForShift = string.IsNullOrWhiteSpace(request.RoleForShift) ? null : request.RoleForShift.Trim();
        shift.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        shift.Status = request.Status;

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(actingUserId, ActivityCategory.Staff, "ShiftUpdated", nameof(Shift), shift.Id,
            $"Shift for {shift.User.FullName} updated to {shift.StartAt:yyyy-MM-dd HH:mm}–{shift.EndAt:HH:mm} ({shift.Status})", ct);

        await notifier.ScheduleChanged(shift.UserId, ct);

        return ToDto(shift);
    }

    public async Task DeleteAsync(Guid id, Guid actingUserId, CancellationToken ct = default)
    {
        var shift = await db.Shifts
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException("Shift not found.");

        var userId = shift.UserId;
        var userName = shift.User.FullName;
        var when = $"{shift.StartAt:yyyy-MM-dd HH:mm}";

        db.Shifts.Remove(shift);
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(actingUserId, ActivityCategory.Staff, "ShiftDeleted", nameof(Shift), id,
            $"Shift for {userName} on {when} deleted", ct);

        await notifier.ScheduleChanged(userId, ct);
    }

    // ---- helpers ----

    private async Task EnsureNoOverlapAsync(Guid userId, DateTime startAt, DateTime endAt, Guid? excludeId, CancellationToken ct)
    {
        var conflict = await db.Shifts
            .Where(s => s.UserId == userId)
            .Where(s => s.Status == ShiftStatus.Scheduled)
            .Where(s => excludeId == null || s.Id != excludeId.Value)
            .AnyAsync(s => s.StartAt < endAt && s.EndAt > startAt, ct);

        if (conflict)
            throw new InvalidOperationException("This employee already has a shift overlapping that time.");
    }

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
        };

    private static ShiftDto ToDto(Shift s) => new(
        s.Id,
        s.UserId,
        s.User.FullName,
        s.User.Role?.Name ?? "",
        s.StartAt,
        s.EndAt,
        (int)s.Duration.TotalMinutes,
        s.RoleForShift,
        s.Notes,
        s.Status,
        s.CreatedAt);
}
