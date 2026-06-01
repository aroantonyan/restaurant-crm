namespace RestaurantCRM.Application.Reports;

/// <summary>
/// At-a-glance KPIs for a date range, plus period-over-period comparison.
///
/// The "prior period" is automatically the same duration ending at `from`:
///   • [from, to) = today 00:00–tomorrow 00:00  →  prior = yesterday
///   • [from, to) = last 7 days                 →  prior = 7 days before that
/// RevenuePctChange / OrderCountPctChange are null when the prior period had zero
/// orders — "nothing to compare against", surfaced as a neutral dash in the UI
/// rather than an infinity sign.
/// </summary>
public record ReportSummaryDto(
    decimal Revenue,
    int OrderCount,
    decimal AverageTicket,
    int ItemsSold,
    decimal? RevenuePctChange,
    decimal? OrderCountPctChange
);

public record TopItemDto(
    Guid MenuItemId,
    string Name,
    int Quantity,
    decimal Revenue
);

public record TopServerDto(
    Guid UserId,
    string Name,
    int OrderCount,
    decimal Revenue
);

public record RevenuePointDto(
    DateOnly Date,
    decimal Revenue,
    int OrderCount
);

/// <summary>
/// One hour bucket for the peak-hours heatmap. Hour is 0–23 (UTC, converted
/// client-side to local — restaurants care about wall-clock, not UTC).
/// </summary>
public record HourlyPointDto(
    int Hour,
    int OrderCount,
    decimal Revenue
);
