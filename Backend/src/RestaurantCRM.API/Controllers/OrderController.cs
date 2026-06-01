using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Orders;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/orders")]
public class OrderController(IOrderService orderService) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewOrders)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await orderService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewOrders)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await orderService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.CreateOrder)]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var result = await orderService.CreateAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/items")]
    [RequirePermission(PermissionType.EditOrder)]
    public async Task<IActionResult> AddItem(Guid id, AddOrderItemRequest request, CancellationToken ct)
    {
        var result = await orderService.AddItemAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    [RequirePermission(PermissionType.EditOrder)]
    public async Task<IActionResult> RemoveItem(Guid id, Guid itemId, CancellationToken ct)
    {
        var result = await orderService.RemoveItemAsync(id, itemId, ct);
        return Ok(result);
    }

    // Marks the order Paid. Cancel uses its own endpoint with its own permission.
    [HttpPatch("{id:guid}/status")]
    [RequirePermission(PermissionType.EditOrder)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateOrderStatusRequest request, CancellationToken ct)
    {
        var result = await orderService.UpdateStatusAsync(id, request, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/cancel")]
    [RequirePermission(PermissionType.CancelOrder)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await orderService.CancelAsync(id, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/items/{itemId:guid}/status")]
    [RequirePermission(PermissionType.MoveOrderItems)]
    public async Task<IActionResult> UpdateItemStatus(Guid id, Guid itemId, UpdateOrderItemStatusRequest request, CancellationToken ct)
    {
        var result = await orderService.UpdateItemStatusAsync(id, itemId, request, ct);
        return Ok(result);
    }

    public record AssignClientRequest(Guid? ClientId);

    [HttpPatch("{id:guid}/client")]
    [RequirePermission(PermissionType.EditOrder)]
    public async Task<IActionResult> AssignClient(Guid id, AssignClientRequest request, CancellationToken ct)
    {
        var result = await orderService.AssignClientAsync(id, request.ClientId, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}/bill")]
    [RequirePermission(PermissionType.ViewOrders)]
    public async Task<IActionResult> GetBill(Guid id, CancellationToken ct)
    {
        var result = await orderService.GetBillPreviewAsync(id, ct);
        return Ok(result);
    }
}
