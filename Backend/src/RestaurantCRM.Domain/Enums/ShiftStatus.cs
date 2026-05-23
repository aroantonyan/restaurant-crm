namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// Status of a scheduled work shift.
///
/// Scheduled — created by a manager, visible to the assigned employee.
/// Cancelled — manager called it off (employee should not show up). Kept in DB
///             for audit / labor reporting.
///
/// Completed is not stored — it's inferred at read time (EndAt < now). A v2
/// "publish workflow" (Draft → Published) can extend this enum without breaking
/// existing data because we store it as a string column.
/// </summary>
public enum ShiftStatus
{
    Scheduled,
    Cancelled,
}
