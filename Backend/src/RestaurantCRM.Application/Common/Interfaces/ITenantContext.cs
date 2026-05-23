namespace RestaurantCRM.Application.Common.Interfaces;

public interface ITenantContext
{
    Guid RestaurantId { get; }
    // The currently authenticated user's id, sourced from the same JWT.
    // Guid.Empty when no user is bound (anonymous endpoints like /login).
    Guid UserId { get; }
    bool HasTenant { get; }
}
