namespace RestaurantCRM.Application.Auth;

public record AuthResponse(
    string Token,
    Guid UserId,
    Guid RestaurantId,
    string RestaurantName,
    string FirstName,
    string LastName,
    string RoleName,
    IReadOnlyList<string> Permissions,
    string Status
);
