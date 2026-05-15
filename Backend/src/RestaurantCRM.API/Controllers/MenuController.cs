using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Menu;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/menu")]
public class MenuController(IMenuService menuService) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewMenu)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await menuService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpPost("categories")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> CreateCategory(CreateCategoryRequest request, CancellationToken ct)
    {
        var result = await menuService.CreateCategoryAsync(request, ct);
        // We don't expose a per-category GET, so just return 200 with the body
        return Ok(result);
    }

    [HttpPut("categories/{id:guid}")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> UpdateCategory(Guid id, UpdateCategoryRequest request, CancellationToken ct)
    {
        var result = await menuService.UpdateCategoryAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("categories/{id:guid}")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await menuService.DeleteCategoryAsync(id, ct);
        return NoContent();
    }

    [HttpPost("items")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> CreateItem(CreateMenuItemRequest request, CancellationToken ct)
    {
        var result = await menuService.CreateItemAsync(request, ct);
        return Ok(result);
    }

    [HttpPut("items/{id:guid}")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> UpdateItem(Guid id, UpdateMenuItemRequest request, CancellationToken ct)
    {
        var result = await menuService.UpdateItemAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPatch("items/{id:guid}/toggle")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> ToggleAvailability(Guid id, CancellationToken ct)
    {
        var result = await menuService.ToggleAvailabilityAsync(id, ct);
        return Ok(result);
    }

    [HttpDelete("items/{id:guid}")]
    [RequirePermission(PermissionType.ManageMenu)]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken ct)
    {
        await menuService.DeleteItemAsync(id, ct);
        return NoContent();
    }
}
