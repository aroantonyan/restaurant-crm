using Microsoft.AspNetCore.Http;
using RestaurantCRM.Application.Common.Interfaces;

namespace RestaurantCRM.Infrastructure.Services;

public class TenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    public Guid RestaurantId => ReadGuidClaim("restaurantId");
    public Guid UserId => ReadGuidClaim("userId");
    public bool HasTenant => RestaurantId != Guid.Empty;

    private Guid ReadGuidClaim(string name)
    {
        var claim = httpContextAccessor.HttpContext?.User.FindFirst(name)?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}
