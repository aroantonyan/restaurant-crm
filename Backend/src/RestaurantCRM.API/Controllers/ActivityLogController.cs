using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/activity-log")]
public class ActivityLogController(IActivityLogService service) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewActivityLog)]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] ActivityCategory? category,
        [FromQuery] Guid? userId,
        [FromQuery] string? entityType,
        [FromQuery] int limit = 100,
        CancellationToken ct = default)
    {
        var result = await service.GetAsync(from, to, category, userId, entityType, Math.Clamp(limit, 1, 500), ct);
        return Ok(result);
    }
}
