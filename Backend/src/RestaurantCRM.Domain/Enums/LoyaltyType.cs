namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// What kind of loyalty program applies to a client.
///
/// None      — no loyalty; orders pay full price, no rewards
/// Cashback  — a % of the paid amount is credited to the client's deposit balance
/// Discount  — a % is taken off the order total at payment time (v2 — not yet implemented)
/// </summary>
public enum LoyaltyType
{
    None,
    Cashback,
    Discount,
}
