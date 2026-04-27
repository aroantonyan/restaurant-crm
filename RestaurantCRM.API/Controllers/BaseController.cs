using Microsoft.AspNetCore.Mvc;

namespace RestaurantCRM.API.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirst("userId")!.Value);

    protected string CurrentUserRole =>
        User.FindFirst("role")!.Value;
}
