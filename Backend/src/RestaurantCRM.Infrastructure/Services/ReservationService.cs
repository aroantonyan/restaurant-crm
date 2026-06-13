using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Reservations;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class ReservationService(AppDbContext db, ITenantContext tenant, IRealtimeNotifier notifier) : IReservationService
{
    // Soft-deleted rows are filtered out automatically by the global query filter
    // configured in AppDbContext. Use `db.Reservations.IgnoreQueryFilters()` to include them.
    public async Task<List<ReservationDto>> GetAllAsync(DateTime? from, DateTime? to, ReservationStatus? status, CancellationToken ct = default)
    {
        var query = db.Reservations
            .Include(r => r.Table)
            .Include(r => r.CreatedBy)
            .Include(r => r.Client)
            .AsQueryable();

        if (from.HasValue) query = query.Where(r => r.StartAt >= from.Value);
        if (to.HasValue) query = query.Where(r => r.StartAt < to.Value);
        if (status.HasValue) query = query.Where(r => r.Status == status.Value);

        var reservations = await query
            .OrderBy(r => r.StartAt)
            .ToListAsync(ct);

        return reservations.Select(ToDto).ToList();
    }

    public async Task<ReservationDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var reservation = await db.Reservations
            .Include(r => r.Table)
            .Include(r => r.CreatedBy)
            .Include(r => r.Client)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Reservation not found.");

        return ToDto(reservation);
    }

    public async Task<ReservationDto> CreateAsync(CreateReservationRequest request, Guid createdById, CancellationToken ct = default)
    {
        var table = await db.Tables.FirstOrDefaultAsync(t => t.Id == request.TableId, ct)
            ?? throw new KeyNotFoundException("Table not found.");

        // Optional CRM link — verify the client exists and isn't archived before storing.
        if (request.ClientId is not null)
        {
            var clientExists = await db.Clients.AnyAsync(c => c.Id == request.ClientId.Value && !c.IsArchived, ct);
            if (!clientExists) throw new KeyNotFoundException("Client not found.");
        }

        var startAt = EnsureUtc(request.StartAt);
        var endAt = startAt.AddMinutes(request.DurationMinutes);

        await EnsureBookableAsync(table, request.GuestCount, startAt, endAt, excludeId: null, enforceFuture: true, ct);

        var reservation = new Reservation
        {
            RestaurantId = tenant.RestaurantId,
            TableId = table.Id,
            CreatedById = createdById,
            ClientId = request.ClientId,
            GuestName = request.GuestName.Trim(),
            GuestPhone = string.IsNullOrWhiteSpace(request.GuestPhone) ? null : request.GuestPhone.Trim(),
            GuestCount = request.GuestCount,
            StartAt = startAt,
            DurationMinutes = request.DurationMinutes,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = ReservationStatus.Confirmed,
        };

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync(ct);

        await notifier.ReservationChanged(reservation.Id, ct);

        return await GetByIdAsync(reservation.Id, ct);
    }

    public async Task<ReservationDto> UpdateAsync(Guid id, UpdateReservationRequest request, CancellationToken ct = default)
    {
        var reservation = await db.Reservations
            .Include(r => r.Table)
            .Include(r => r.CreatedBy)
            .Include(r => r.Client)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Reservation not found.");

        // Completed reservations are immutable (the meal actually happened).
        // Cancelled / NoShow can be restored via SetStatus, but edits to fields require restoring first.
        if (reservation.Status is ReservationStatus.Completed or ReservationStatus.Cancelled or ReservationStatus.NoShow)
            throw new InvalidOperationException("This reservation can no longer be edited.");

        if (request.TableId != reservation.TableId)
        {
            var newTable = await db.Tables.FirstOrDefaultAsync(t => t.Id == request.TableId, ct)
                ?? throw new KeyNotFoundException("Table not found.");
            reservation.TableId = newTable.Id;
            reservation.Table = newTable;
        }

        // Re-link / un-link the CRM client. Verify before persisting.
        if (request.ClientId is not null && request.ClientId != reservation.ClientId)
        {
            var clientExists = await db.Clients.AnyAsync(c => c.Id == request.ClientId.Value && !c.IsArchived, ct);
            if (!clientExists) throw new KeyNotFoundException("Client not found.");
        }
        reservation.ClientId = request.ClientId;

        var startAt = EnsureUtc(request.StartAt);
        var endAt = startAt.AddMinutes(request.DurationMinutes);

        // Only force a future time when the slot is actually being moved — editing
        // notes/guests on an in-progress or just-passed reservation must still work.
        var movedTime = startAt != reservation.StartAt;
        await EnsureBookableAsync(reservation.Table, request.GuestCount, startAt, endAt, excludeId: reservation.Id, enforceFuture: movedTime, ct);

        reservation.GuestName = request.GuestName.Trim();
        reservation.GuestPhone = string.IsNullOrWhiteSpace(request.GuestPhone) ? null : request.GuestPhone.Trim();
        reservation.GuestCount = request.GuestCount;
        reservation.StartAt = startAt;
        reservation.DurationMinutes = request.DurationMinutes;
        reservation.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        await db.SaveChangesAsync(ct);

        await notifier.ReservationChanged(reservation.Id, ct);

        return await GetByIdAsync(reservation.Id, ct);
    }

    public async Task<ReservationDto> SetStatusAsync(Guid id, UpdateReservationStatusRequest request, CancellationToken ct = default)
    {
        var reservation = await db.Reservations
            .Include(r => r.Table)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Reservation not found.");

        if (!IsValidTransition(reservation.Status, request.Status))
            throw new InvalidOperationException($"Cannot move reservation from {reservation.Status} to {request.Status}.");

        // Restoring (Cancelled/NoShow → Confirmed) must not collide with reservations
        // that may have been booked over this slot in the meantime.
        var isRestoreToConfirmed =
            request.Status == ReservationStatus.Confirmed &&
            (reservation.Status == ReservationStatus.Cancelled || reservation.Status == ReservationStatus.NoShow);

        if (isRestoreToConfirmed)
        {
            await EnsureBookableAsync(reservation.Table, reservation.GuestCount, reservation.StartAt, reservation.EndAt, excludeId: reservation.Id, enforceFuture: false, ct);
        }

        reservation.Status = request.Status;

        // Table-status side-effects.
        var tableChanged = false;
        if (request.Status == ReservationStatus.Seated && reservation.Table.Status == TableStatus.Free)
        {
            reservation.Table.Status = TableStatus.Reserved;
            tableChanged = true;
        }
        else if (request.Status == ReservationStatus.Completed && reservation.Table.Status == TableStatus.Reserved)
        {
            reservation.Table.Status = TableStatus.Free;
            tableChanged = true;
        }

        await db.SaveChangesAsync(ct);

        await notifier.ReservationChanged(reservation.Id, ct);
        if (tableChanged) await notifier.TableChanged(reservation.TableId, ct);

        return await GetByIdAsync(reservation.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        // Soft delete — the row stays for audit / future reporting.
        var reservation = await db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Reservation not found.");

        reservation.IsDeleted = true;
        reservation.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await notifier.ReservationChanged(reservation.Id, ct);
    }

    // ---- helpers ----

    // Single gate for every write path (create / edit / restore): seat count,
    // future time, one-booking-per-day, and a defensive time-overlap check.
    private async Task EnsureBookableAsync(
        Table table, int guestCount, DateTime startAt, DateTime endAt,
        Guid? excludeId, bool enforceFuture, CancellationToken ct)
    {
        if (guestCount > table.Capacity)
            throw new InvalidOperationException(
                $"Table {table.Number} seats up to {table.Capacity} — this booking is for {guestCount}.");

        if (enforceFuture && startAt <= DateTime.UtcNow)
            throw new InvalidOperationException("Reservation time must be in the future.");

        // Active = blocks a slot. Soft-deleted rows are filtered out globally.
        var active = db.Reservations
            .Where(r => r.TableId == table.Id)
            .Where(r => r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.Seated)
            .Where(r => excludeId == null || r.Id != excludeId.Value);

        // One active reservation per table per calendar day (UTC).
        var dayStart = new DateTime(startAt.Year, startAt.Month, startAt.Day, 0, 0, 0, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);
        if (await active.AnyAsync(r => r.StartAt >= dayStart && r.StartAt < dayEnd, ct))
            throw new InvalidOperationException("This table already has a reservation on that day.");

        // Defensive: catches cross-midnight overlaps the per-day rule can't see
        // (A overlaps B iff A.start < B.end AND A.end > B.start).
        if (await active.AnyAsync(r => r.StartAt < endAt && r.StartAt.AddMinutes(r.DurationMinutes) > startAt, ct))
            throw new InvalidOperationException("This table is already reserved during the selected time.");
    }

    private static DateTime EnsureUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc), // controller sends UTC ISO strings — trust them
        };

    // Allowed transitions:
    //   Confirmed → Seated | Cancelled | NoShow
    //   Seated    → Completed | Cancelled
    //   Cancelled → Confirmed   (correction — admin marked by mistake)
    //   NoShow    → Confirmed   (correction — guest arrived late after being marked)
    //   Completed → (terminal)  the meal actually happened
    private static bool IsValidTransition(ReservationStatus from, ReservationStatus to)
    {
        if (from == to) return true; // idempotent
        return (from, to) switch
        {
            (ReservationStatus.Confirmed, ReservationStatus.Seated)    => true,
            (ReservationStatus.Confirmed, ReservationStatus.Cancelled) => true,
            (ReservationStatus.Confirmed, ReservationStatus.NoShow)    => true,
            (ReservationStatus.Seated,    ReservationStatus.Completed) => true,
            (ReservationStatus.Seated,    ReservationStatus.Cancelled) => true,
            (ReservationStatus.Cancelled, ReservationStatus.Confirmed) => true,
            (ReservationStatus.NoShow,    ReservationStatus.Confirmed) => true,
            _ => false,
        };
    }

    private static ReservationDto ToDto(Reservation r) =>
        new(r.Id, r.TableId, r.Table.Number, r.GuestName, r.GuestPhone, r.GuestCount,
            r.StartAt, r.DurationMinutes, r.EndAt, r.Status, r.Notes,
            r.CreatedBy.FullName, r.CreatedAt,
            r.ClientId, r.Client?.FullName);
}
