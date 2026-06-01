namespace RestaurantCRM.Application.Reports;

/// <summary>
/// Read-only analytics over Paid orders in a date range.
/// All methods accept inclusive `from` / exclusive `to` in UTC.
/// </summary>
public interface IReportsService
{
    Task<ReportSummaryDto> GetSummaryAsync(DateTime from, DateTime to, CancellationToken ct = default);
    Task<List<TopItemDto>> GetTopItemsAsync(DateTime from, DateTime to, int limit, CancellationToken ct = default);
    Task<List<TopServerDto>> GetTopServersAsync(DateTime from, DateTime to, int limit, CancellationToken ct = default);
    Task<List<RevenuePointDto>> GetRevenueTrendAsync(DateTime from, DateTime to, CancellationToken ct = default);
    /// <summary>
    /// Orders + revenue grouped by hour-of-day (0–23) in the given range.
    /// Returns all 24 buckets, zeroed for hours with no orders.
    /// </summary>
    Task<List<HourlyPointDto>> GetHourlyBreakdownAsync(DateTime from, DateTime to, CancellationToken ct = default);
}
