namespace RestaurantCRM.Application.Reports;

/// <summary>
/// At-a-glance KPIs for a date range. Revenue = sum of Paid orders' Total
/// (Cancelled and Open are excluded — same definition every POS uses).
/// </summary>
public record ReportSummaryDto(
    decimal Revenue,
    int OrderCount,
    decimal AverageTicket,
    int ItemsSold
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
