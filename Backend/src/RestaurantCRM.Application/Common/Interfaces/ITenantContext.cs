namespace RestaurantCRM.Application.Common.Interfaces;

public interface ITenantContext
{
    Guid RestaurantId { get; }
    bool HasTenant { get; }
}
