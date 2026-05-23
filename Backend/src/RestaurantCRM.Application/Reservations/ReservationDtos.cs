using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Reservations;

public record ReservationDto(
    Guid Id,
    Guid TableId,
    int TableNumber,
    string GuestName,
    string? GuestPhone,
    int GuestCount,
    DateTime StartAt,
    int DurationMinutes,
    DateTime EndAt,
    ReservationStatus Status,
    string? Notes,
    string CreatedByName,
    DateTime CreatedAt,
    // Optional CRM link. Null when the reservation is a one-off walk-in.
    Guid? ClientId = null,
    string? ClientName = null
);

public record CreateReservationRequest(
    Guid TableId,
    string GuestName,
    string? GuestPhone,
    int GuestCount,
    DateTime StartAt,
    int DurationMinutes,
    string? Notes,
    // Optional CRM link. When set, the service still keeps GuestName/Phone as
    // a snapshot so the row stays readable independent of client changes.
    Guid? ClientId = null
);

public record UpdateReservationRequest(
    Guid TableId,
    string GuestName,
    string? GuestPhone,
    int GuestCount,
    DateTime StartAt,
    int DurationMinutes,
    string? Notes,
    Guid? ClientId = null
);

public record UpdateReservationStatusRequest(ReservationStatus Status);
