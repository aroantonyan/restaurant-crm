using Microsoft.AspNetCore.Diagnostics;

namespace RestaurantCRM.API;

internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (statusCode, message) = exception switch
        {
            KeyNotFoundException        => (StatusCodes.Status404NotFound,            exception.Message),
            InvalidOperationException   => (StatusCodes.Status409Conflict,            exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized,        exception.Message),
            ArgumentException           => (StatusCodes.Status400BadRequest,          exception.Message),
            _                           => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new { error = message }, ct);
        return true;
    }
}
