using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Restaurants;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/restaurants")]
public class RestaurantController(IRestaurantService restaurantService) : BaseController
{
    [HttpGet("me")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        // Any authenticated user can view their own restaurant info — no permission needed
        var result = await restaurantService.GetAsync(ct);
        return Ok(result);
    }

    [HttpPut("me")]
    [RequirePermission(PermissionType.ManageRestaurantSettings)]
    public async Task<IActionResult> Update(UpdateRestaurantRequest request, CancellationToken ct)
    {
        var result = await restaurantService.UpdateAsync(request, ct);
        return Ok(result);
    }
}
