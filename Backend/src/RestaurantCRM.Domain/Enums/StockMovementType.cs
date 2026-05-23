namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// What caused a stock change. The sign of QuantityChange tells direction;
/// Type tells *why* — needed for accurate reporting and audits.
///
/// Initial    — opening balance when the product is created
/// Purchase   — delivery from a supplier (positive)
/// Adjustment — manual correction during a stocktake (positive or negative)
/// Wastage    — spoilage, breakage, expired items (negative)
/// Sale       — reserved for future auto-deduction when a menu item is served
/// </summary>
public enum StockMovementType
{
    Initial,
    Purchase,
    Adjustment,
    Wastage,
    Sale,
}
