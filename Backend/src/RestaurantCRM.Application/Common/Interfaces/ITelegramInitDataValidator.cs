namespace RestaurantCRM.Application.Common.Interfaces;

/// <summary>
/// Verifies the integrity of Telegram Mini App <c>initData</c> — the signed
/// query-string Telegram injects into the WebView. A valid result proves the
/// request originated inside the genuine Telegram client for our bot, not a
/// forged or replayed payload.
/// </summary>
public interface ITelegramInitDataValidator
{
    TelegramInitDataResult Validate(string? initData);
}

/// <summary>
/// Outcome of validation. <see cref="TelegramUserId"/> is the authenticated
/// Telegram user id parsed from the <c>user</c> field, available only on success.
/// </summary>
public readonly record struct TelegramInitDataResult(bool IsValid, long? TelegramUserId, string? Error)
{
    public static TelegramInitDataResult Valid(long? telegramUserId) => new(true, telegramUserId, null);
    public static TelegramInitDataResult Invalid(string error) => new(false, null, error);
}
