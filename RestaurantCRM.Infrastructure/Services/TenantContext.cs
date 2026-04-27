using Microsoft.AspNetCore.Http;
using RestaurantCRM.Application.Common.Interfaces;

namespace RestaurantCRM.Infrastructure.Services;

public class TenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    public Guid RestaurantId
    {
        get
        {
            var claim = httpContextAccessor.HttpContext?.User.FindFirst("restaurantId")?.Value;
            return claim is not null ? Guid.Parse(claim) : Guid.Empty;
        }
    }

    public bool HasTenant => RestaurantId != Guid.Empty;
}
