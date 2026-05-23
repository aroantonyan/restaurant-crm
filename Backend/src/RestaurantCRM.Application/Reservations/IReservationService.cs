using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Reservations;

public interface IReservationService
{
    Task<List<ReservationDto>> GetAllAsync(DateTime? from, DateTime? to, ReservationStatus? status, CancellationToken ct = default);
    Task<ReservationDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ReservationDto> CreateAsync(CreateReservationRequest request, Guid createdById, CancellationToken ct = default);
    Task<ReservationDto> UpdateAsync(Guid id, UpdateReservationRequest request, CancellationToken ct = default);
    Task<ReservationDto> SetStatusAsync(Guid id, UpdateReservationStatusRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
