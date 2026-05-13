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
        try
        {
            var result = await restaurantService.GetAsync(ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPut("me")]
    public async Task<IActionResult> Update(UpdateRestaurantRequest request, CancellationToken ct)
    {
        try
        {
            var result = await restaurantService.UpdateAsync(request, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
