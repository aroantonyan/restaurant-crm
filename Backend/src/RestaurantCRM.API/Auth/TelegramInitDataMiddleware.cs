using Microsoft.Extensions.Options;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Common.Settings;

namespace RestaurantCRM.API.Auth;

/// <summary>
/// When <c>Telegram:Enforce</c> is on, requires a valid <c>X-Telegram-Init-Data</c>
/// header on protected API routes — a second factor proving the call came from
/// inside the real Telegram WebView, layered on top of the JWT.
///
/// Skipped for: auth endpoints (login happens before a session exists), the health
/// probe, CORS preflight, and any non-/api path (static assets, the SPA, hubs).
/// </summary>
public class TelegramInitDataMiddleware(
    RequestDelegate next,
    ITelegramInitDataValidator validator,
    IOptions<TelegramSettings> options,
    ILogger<TelegramInitDataMiddleware> logger)
{
    private readonly TelegramSettings _settings = options.Value;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_settings.Enforce || !RequiresCheck(context))
        {
            await next(context);
            return;
        }

        var initData = context.Request.Headers["X-Telegram-Init-Data"].ToString();
        var result = validator.Validate(initData);

        if (!result.IsValid)
        {
            logger.LogWarning("Rejected request to {Path}: invalid Telegram initData ({Error})",
                context.Request.Path, result.Error);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid Telegram session." });
            return;
        }

        await next(context);
    }

    private static bool RequiresCheck(HttpContext context)
    {
        if (HttpMethods.IsOptions(context.Request.Method)) return false;

        var path = context.Request.Path;
        return path.StartsWithSegments("/api")
            && !path.StartsWithSegments("/api/auth");
    }
}
