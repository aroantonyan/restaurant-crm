using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Inventory;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/products")]
public class ProductsController(IInventoryService service) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewWarehouse)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? category,
        [FromQuery] bool lowStockOnly = false,
        [FromQuery] bool includeArchived = false,
        CancellationToken ct = default)
    {
        var result = await service.GetAllAsync(category, lowStockOnly, includeArchived, ct);
        return Ok(result);
    }

    [HttpGet("categories")]
    [RequirePermission(PermissionType.ViewWarehouse)]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var result = await service.GetCategoriesAsync(ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewWarehouse)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await service.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageWarehouse)]
    public async Task<IActionResult> Create(CreateProductRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageWarehouse)]
    public async Task<IActionResult> Update(Guid id, UpdateProductRequest request, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageWarehouse)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/movements")]
    [RequirePermission(PermissionType.ViewWarehouse)]
    public async Task<IActionResult> GetMovements(Guid id, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var result = await service.GetMovementsAsync(id, Math.Clamp(limit, 1, 200), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/movements")]
    [RequirePermission(PermissionType.ManageWarehouse)]
    public async Task<IActionResult> AddMovement(Guid id, AddStockMovementRequest request, CancellationToken ct)
    {
        var result = await service.AddMovementAsync(id, request, CurrentUserId, ct);
        return Ok(result);
    }
}
