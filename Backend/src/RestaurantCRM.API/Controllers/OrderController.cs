using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.Application.Orders;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/orders")]
public class OrderController(IOrderService orderService) : BaseController
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await orderService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await orderService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var result = await orderService.CreateAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/items")]
    public async Task<IActionResult> AddItem(Guid id, AddOrderItemRequest request, CancellationToken ct)
    {
        var result = await orderService.AddItemAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid id, Guid itemId, CancellationToken ct)
    {
        var result = await orderService.RemoveItemAsync(id, itemId, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateOrderStatusRequest request, CancellationToken ct)
    {
        var result = await orderService.UpdateStatusAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/items/{itemId:guid}/status")]
    public async Task<IActionResult> UpdateItemStatus(Guid id, Guid itemId, UpdateOrderItemStatusRequest request, CancellationToken ct)
    {
        var result = await orderService.UpdateItemStatusAsync(id, itemId, request, ct);
        return Ok(result);
    }
}
