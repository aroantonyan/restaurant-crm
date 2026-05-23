namespace RestaurantCRM.Application.Schedule;

public interface IScheduleService
{
    /// <summary>
    /// All shifts in the [from, to) range for the tenant.
    /// `userId` filters to a single employee when supplied (used by personal view).
    /// </summary>
    Task<List<ShiftDto>> GetAsync(DateTime from, DateTime to, Guid? userId, CancellationToken ct = default);

    Task<ShiftDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ShiftDto> CreateAsync(CreateShiftRequest request, Guid actingUserId, CancellationToken ct = default);
    Task<ShiftDto> UpdateAsync(Guid id, UpdateShiftRequest request, Guid actingUserId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, Guid actingUserId, CancellationToken ct = default);
}
