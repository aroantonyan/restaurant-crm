using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Reports;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/reports")]
public class ReportsController(IReportsService reports) : BaseController
{
    // Every endpoint takes a half-open range [from, to). UTC. The frontend
    // computes the bounds for the chip the user picks (today / 7d / 30d / custom).
    // A small page-size cap on top-N lists prevents pathological queries.
    private const int MaxTopLimit = 20;

    [HttpGet("summary")]
    [RequirePermission(PermissionType.ViewReports)]
    public async Task<IActionResult> GetSummary(DateTime from, DateTime to, CancellationToken ct)
    {
        var result = await reports.GetSummaryAsync(from, to, ct);
        return Ok(result);
    }

    [HttpGet("top-items")]
    [RequirePermission(PermissionType.ViewReports)]
    public async Task<IActionResult> GetTopItems(DateTime from, DateTime to, int limit = 5, CancellationToken ct = default)
    {
        var result = await reports.GetTopItemsAsync(from, to, Math.Clamp(limit, 1, MaxTopLimit), ct);
        return Ok(result);
    }

    [HttpGet("top-servers")]
    [RequirePermission(PermissionType.ViewReports)]
    public async Task<IActionResult> GetTopServers(DateTime from, DateTime to, int limit = 5, CancellationToken ct = default)
    {
        var result = await reports.GetTopServersAsync(from, to, Math.Clamp(limit, 1, MaxTopLimit), ct);
        return Ok(result);
    }

    [HttpGet("revenue-trend")]
    [RequirePermission(PermissionType.ViewReports)]
    public async Task<IActionResult> GetRevenueTrend(DateTime from, DateTime to, CancellationToken ct)
    {
        var result = await reports.GetRevenueTrendAsync(from, to, ct);
        return Ok(result);
    }

    [HttpGet("hourly-breakdown")]
    [RequirePermission(PermissionType.ViewReports)]
    public async Task<IActionResult> GetHourlyBreakdown(DateTime from, DateTime to, CancellationToken ct)
    {
        var result = await reports.GetHourlyBreakdownAsync(from, to, ct);
        return Ok(result);
    }
}
