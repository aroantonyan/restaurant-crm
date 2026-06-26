namespace RestaurantCRM.Application.Auth;

public record AuthResponse(
    string Token,
    Guid UserId,
    Guid RestaurantId,
    string RestaurantName,
    string Currency,
    string FirstName,
    string LastName,
    string RoleName,
    IReadOnlyList<string> Permissions,
    string Status,
    // Opaque rotating credential — the client stores it and calls /auth/refresh
    // to mint a new access token when the current one expires.
    string RefreshToken
);
