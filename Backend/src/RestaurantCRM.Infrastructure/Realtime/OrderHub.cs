using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using RestaurantCRM.Application.Common.Interfaces;

namespace RestaurantCRM.Infrastructure.Realtime;

/// <summary>
/// Single hub for all push events (orders, tables, reservations).
/// Each connection auto-joins the caller's restaurant group so emissions
/// stay tenant-scoped. Authentication is required — JWT carries restaurantId.
/// </summary>
[Authorize]
public class OrderHub(ITenantContext tenant) : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (tenant.HasTenant)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(tenant.RestaurantId));
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (tenant.HasTenant)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(tenant.RestaurantId));
        }
        await base.OnDisconnectedAsync(exception);
    }

    public static string GroupName(Guid restaurantId) => $"restaurant-{restaurantId}";
}
