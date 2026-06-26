namespace RestaurantCRM.Application.Common.Settings;

public class JwtSettings
{
    public string Secret { get; init; } = string.Empty;
    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;

    // Short-lived access token: kept small so a leaked/expired token is useless
    // quickly. Sessions stay alive via the rotating refresh token below.
    public int AccessTokenMinutes { get; init; } = 60;
    public int RefreshTokenDays { get; init; } = 14;
}
