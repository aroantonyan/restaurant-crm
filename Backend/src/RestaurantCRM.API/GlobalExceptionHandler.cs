using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace RestaurantCRM.API;

internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    // Surfaced when an optimistic-concurrency check (xmin row-version) detects
    // that a row was updated by another transaction between read and write —
    // e.g. two cashiers pressing Pay on the same order. Friendly message; the
    // client should refetch and retry.
    private const string ConcurrencyMessage = "This record was updated by someone else. Please refresh and try again.";

    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (statusCode, message) = exception switch
        {
            KeyNotFoundException          => (StatusCodes.Status404NotFound,            exception.Message),
            DbUpdateConcurrencyException  => (StatusCodes.Status409Conflict,            ConcurrencyMessage),
            InvalidOperationException     => (StatusCodes.Status409Conflict,            exception.Message),
            UnauthorizedAccessException   => (StatusCodes.Status401Unauthorized,        exception.Message),
            ArgumentException             => (StatusCodes.Status400BadRequest,          exception.Message),
            _                             => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new { error = message }, ct);
        return true;
    }
}
