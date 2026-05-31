using System.Security.Cryptography;
using System.Text;
using System.Web;
using Microsoft.Extensions.Options;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Common.Settings;

namespace RestaurantCRM.Infrastructure.Auth;

/// <summary>
/// Implements Telegram's official initData verification algorithm:
///   1. Split the data into key=value pairs, drop the `hash` field.
///   2. Build the data-check-string: pairs sorted by key, joined by '\n'.
///   3. secret = HMAC-SHA256(key: "WebAppData", message: bot_token).
///   4. expected = HMAC-SHA256(key: secret, message: data-check-string), hex-encoded.
///   5. Constant-time compare expected vs the supplied `hash`.
/// See https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
/// </summary>
public class TelegramInitDataValidator(IOptions<TelegramSettings> options) : ITelegramInitDataValidator
{
    private readonly TelegramSettings _settings = options.Value;

    public TelegramInitDataResult Validate(string? initData)
    {
        if (string.IsNullOrWhiteSpace(initData))
            return TelegramInitDataResult.Invalid("Missing initData.");

        if (string.IsNullOrEmpty(_settings.BotToken))
            return TelegramInitDataResult.Invalid("Bot token not configured.");

        // Parse without decoding yet — we need the raw pairs for the check string.
        var pairs = initData
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part =>
            {
                var eq = part.IndexOf('=');
                return eq < 0
                    ? (Key: part, Value: string.Empty)
                    : (Key: part[..eq], Value: part[(eq + 1)..]);
            })
            .ToList();

        var hashPair = pairs.FirstOrDefault(p => p.Key == "hash");
        if (hashPair.Key is null || string.IsNullOrEmpty(hashPair.Value))
            return TelegramInitDataResult.Invalid("Missing hash.");

        // Data-check-string: every field except `hash`, URL-decoded, sorted by key, '\n'-joined.
        var dataCheckString = string.Join('\n', pairs
            .Where(p => p.Key != "hash")
            .Select(p => $"{p.Key}={HttpUtility.UrlDecode(p.Value)}")
            .OrderBy(s => s, StringComparer.Ordinal));

        var secretKey = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("WebAppData"),
            Encoding.UTF8.GetBytes(_settings.BotToken));

        var expectedHash = Convert.ToHexStringLower(
            HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString)));

        // Constant-time comparison defeats timing side-channels on the signature.
        var providedHash = hashPair.Value.ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expectedHash),
                Encoding.ASCII.GetBytes(providedHash)))
            return TelegramInitDataResult.Invalid("Hash mismatch.");

        // Freshness: reject stale payloads to bound the replay window.
        if (_settings.MaxAgeMinutes > 0)
        {
            var authDatePair = pairs.FirstOrDefault(p => p.Key == "auth_date");
            if (authDatePair.Key is null || !long.TryParse(authDatePair.Value, out var authUnix))
                return TelegramInitDataResult.Invalid("Missing or invalid auth_date.");

            var age = DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(authUnix);
            if (age > TimeSpan.FromMinutes(_settings.MaxAgeMinutes))
                return TelegramInitDataResult.Invalid("initData expired.");
        }

        return TelegramInitDataResult.Valid(ParseTelegramUserId(pairs));
    }

    private static long? ParseTelegramUserId(List<(string Key, string Value)> pairs)
    {
        var userPair = pairs.FirstOrDefault(p => p.Key == "user");
        if (userPair.Key is null) return null;

        // `user` is a URL-encoded JSON object; we only need its numeric `id`.
        var json = HttpUtility.UrlDecode(userPair.Value);
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("id", out var id) && id.TryGetInt64(out var value)
                ? value
                : null;
        }
        catch (System.Text.Json.JsonException)
        {
            return null;
        }
    }
}
