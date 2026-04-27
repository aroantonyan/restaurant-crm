namespace RestaurantCRM.Application.Auth;

public record AuthResponse(
    string Token,
    Guid UserId,
    Guid RestaurantId,
    string FirstName,
    string LastName,
    string RoleName
);
