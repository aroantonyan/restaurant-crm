using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Schedule;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/schedule")]
public class ScheduleController(IScheduleService service) : BaseController
{
    /// <summary>
    /// Shifts in [from, to). When the caller lacks ManageSchedules, the response
    /// is silently scoped to their own user — preventing privacy leaks even if
    /// the client requests another user's shifts.
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ViewSchedules)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] Guid? userId,
        CancellationToken ct)
    {
        var canViewAll = HasPermission(PermissionType.ManageSchedules);
        var effectiveUserId = canViewAll ? userId : CurrentUserId;

        var result = await service.GetAsync(from, to, effectiveUserId, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewSchedules)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await service.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageSchedules)]
    public async Task<IActionResult> Create(CreateShiftRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageSchedules)]
    public async Task<IActionResult> Update(Guid id, UpdateShiftRequest request, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, request, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageSchedules)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, CurrentUserId, ct);
        return NoContent();
    }

    // Local helper — BaseController doesn't expose this yet.
    private bool HasPermission(PermissionType permission)
    {
        var claim = User.FindFirst("permissions")?.Value;
        if (string.IsNullOrEmpty(claim)) return false;
        return claim.Split(',', StringSplitOptions.RemoveEmptyEntries).Contains(permission.ToString());
    }
}
