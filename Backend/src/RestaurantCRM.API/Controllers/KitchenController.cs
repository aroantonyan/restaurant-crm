using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Orders;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

/// <summary>
/// Read-only endpoints powering the Kitchen Display (KDS). Item-status changes
/// continue to go through PATCH /api/orders/{id}/items/{itemId}/status so the
/// existing realtime fan-out (orderChanged) drives live UI updates.
/// </summary>
[Authorize]
[Route("api/kitchen")]
public class KitchenController(IOrderService orderService) : BaseController
{
    [HttpGet("queue")]
    [RequirePermission(PermissionType.MoveOrderItems)]
    public async Task<IActionResult> Queue(CancellationToken ct)
    {
        var result = await orderService.GetKitchenQueueAsync(ct);
        return Ok(result);
    }

    public record BumpRequest(string Status);

    // Bump every kitchen-side item on a ticket to Ready (or Served) in one shot.
    [HttpPost("orders/{orderId:guid}/bump")]
    [RequirePermission(PermissionType.MoveOrderItems)]
    public async Task<IActionResult> Bump(Guid orderId, BumpRequest request, CancellationToken ct)
    {
        var result = await orderService.BumpOrderItemsAsync(orderId, request.Status, ct);
        return Ok(result);
    }
}
