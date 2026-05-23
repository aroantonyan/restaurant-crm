using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Staff;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/staff")]
public class StaffController(IStaffService staffService) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewStaff)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await staffService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("roles")]
    [RequirePermission(PermissionType.ViewStaff)]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var result = await staffService.GetRolesAsync(ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewStaff)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await staffService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageStaff)]
    public async Task<IActionResult> Create(CreateStaffRequest request, CancellationToken ct)
    {
        var result = await staffService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageStaff)]
    public async Task<IActionResult> Update(Guid id, UpdateStaffRequest request, CancellationToken ct)
    {
        var result = await staffService.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPut("{id:guid}/permissions")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<IActionResult> SetPermissions(Guid id, SetPermissionsRequest request, CancellationToken ct)
    {
        var result = await staffService.SetPermissionsAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageStaff)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await staffService.DeactivateAsync(id, ct);
        return NoContent();
    }
}
