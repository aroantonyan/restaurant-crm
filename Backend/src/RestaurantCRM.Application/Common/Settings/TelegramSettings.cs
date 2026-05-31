namespace RestaurantCRM.Application.Common.Settings;

/// <summary>
/// Configuration for verifying Telegram Mini App <c>initData</c>.
/// Bound from the <c>Telegram</c> section of configuration.
/// </summary>
public class TelegramSettings
{
    /// <summary>
    /// When true, requests to protected API routes must carry a valid
    /// <c>X-Telegram-Init-Data</c> header. Off by default so local dev and
    /// non-Telegram browsers keep working with JWT only.
    /// </summary>
    public bool Enforce { get; set; }

    /// <summary>
    /// The bot token from @BotFather. Used as the HMAC key material.
    /// Never commit a real value — supply via environment/secret.
    /// </summary>
    public string BotToken { get; set; } = string.Empty;

    /// <summary>
    /// Reject initData whose <c>auth_date</c> is older than this many minutes,
    /// limiting the replay window if a signed payload leaks. 0 disables the age check.
    /// </summary>
    public int MaxAgeMinutes { get; set; } = 1440; // 24h
}
