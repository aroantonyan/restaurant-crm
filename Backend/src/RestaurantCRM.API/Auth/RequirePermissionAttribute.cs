using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Auth;

/// <summary>
/// Action filter that requires the JWT to carry the given permission in its `permissions` claim.
/// Returns 403 Forbidden if the user is missing it.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public sealed class RequirePermissionAttribute(PermissionType permission) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var claim = context.HttpContext.User.FindFirst("permissions")?.Value;
        if (string.IsNullOrEmpty(claim))
        {
            context.Result = new ObjectResult(new { error = "Forbidden." }) { StatusCode = 403 };
            return;
        }

        var permissions = claim.Split(',', StringSplitOptions.RemoveEmptyEntries);
        if (!permissions.Contains(permission.ToString()))
        {
            context.Result = new ObjectResult(new { error = "Forbidden." }) { StatusCode = 403 };
        }
    }
}
