using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.Application.Restaurants;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/restaurants")]
public class RestaurantController(IRestaurantService restaurantService) : BaseController
{
    [HttpGet("me")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await restaurantService.GetAsync(ct);
        return Ok(result);
    }

    [HttpPut("me")]
    public async Task<IActionResult> Update(UpdateRestaurantRequest request, CancellationToken ct)
    {
        var result = await restaurantService.UpdateAsync(request, ct);
        return Ok(result);
    }
}
