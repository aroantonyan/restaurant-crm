using Microsoft.AspNetCore.SignalR;
using RestaurantCRM.Application.Common.Interfaces;

namespace RestaurantCRM.Infrastructure.Realtime;

/// <summary>
/// Pushes "X changed" events to the caller's restaurant group.
/// Payloads carry the id only — clients refetch via REST so cached payloads can't drift.
/// </summary>
public class RealtimeNotifier(IHubContext<OrderHub> hub, ITenantContext tenant) : IRealtimeNotifier
{
    public Task OrderChanged(Guid orderId, CancellationToken ct = default) =>
        Emit("orderChanged", new { orderId }, ct);

    public Task TableChanged(Guid tableId, CancellationToken ct = default) =>
        Emit("tableChanged", new { tableId }, ct);

    public Task ReservationChanged(Guid reservationId, CancellationToken ct = default) =>
        Emit("reservationChanged", new { reservationId }, ct);

    public Task ProductChanged(Guid productId, CancellationToken ct = default) =>
        Emit("productChanged", new { productId }, ct);

    public Task MenuItemChanged(Guid menuItemId, CancellationToken ct = default) =>
        Emit("menuItemChanged", new { menuItemId }, ct);

    public Task ScheduleChanged(Guid userId, CancellationToken ct = default) =>
        Emit("scheduleChanged", new { userId }, ct);

    private Task Emit(string eventName, object payload, CancellationToken ct)
    {
        if (!tenant.HasTenant) return Task.CompletedTask;
        return hub.Clients
            .Group(OrderHub.GroupName(tenant.RestaurantId))
            .SendAsync(eventName, payload, ct);
    }
}
