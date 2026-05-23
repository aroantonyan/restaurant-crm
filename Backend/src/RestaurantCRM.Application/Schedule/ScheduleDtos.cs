using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Schedule;

public record ShiftDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string UserRoleName,
    DateTime StartAt,
    DateTime EndAt,
    int DurationMinutes,
    string? RoleForShift,
    string? Notes,
    ShiftStatus Status,
    DateTime CreatedAt);

public record CreateShiftRequest(
    Guid UserId,
    DateTime StartAt,
    DateTime EndAt,
    string? RoleForShift,
    string? Notes);

public record UpdateShiftRequest(
    Guid UserId,
    DateTime StartAt,
    DateTime EndAt,
    string? RoleForShift,
    string? Notes,
    ShiftStatus Status);
