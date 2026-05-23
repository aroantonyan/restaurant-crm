namespace RestaurantCRM.Application.Common.Interfaces;

/// <summary>
/// Pushes "something changed" notifications to all connected clients of the current tenant.
/// Payloads carry the entity id only — clients refetch via the regular REST endpoints,
/// which keeps auth/permission filters consistent with normal reads.
/// </summary>
public interface IRealtimeNotifier
{
    Task OrderChanged(Guid orderId, CancellationToken ct = default);
    Task TableChanged(Guid tableId, CancellationToken ct = default);
    Task ReservationChanged(Guid reservationId, CancellationToken ct = default);
    Task ProductChanged(Guid productId, CancellationToken ct = default);
    Task MenuItemChanged(Guid menuItemId, CancellationToken ct = default);
    Task ScheduleChanged(Guid userId, CancellationToken ct = default);
}
