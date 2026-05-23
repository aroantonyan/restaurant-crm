using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// Append-only audit row for every change to a Product's stock.
///
/// QuantityChange is signed: positive for inbound (Purchase, positive Adjustment),
/// negative for outbound (Wastage, Sale, negative Adjustment).
///
/// QuantityAfter is a snapshot of the product's stock AFTER applying this row.
/// Carrying it avoids replaying the entire log for the most common queries
/// ("what was the stock right after this delivery?").
///
/// CreatedById uses Restrict — users cannot be deleted while their movements exist,
/// preserving accountability.
/// </summary>
public class StockMovement : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid ProductId { get; set; }
    public Guid CreatedById { get; set; }

    public StockMovementType Type { get; set; }
    public decimal QuantityChange { get; set; }
    public decimal QuantityAfter { get; set; }
    public string? Reason { get; set; }

    public Product Product { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
