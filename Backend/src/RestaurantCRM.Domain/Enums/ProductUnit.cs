namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// Units of measurement supported for inventory products.
/// Weight (Kg/Gram), Volume (Liter/Milliliter), and discrete count (Piece).
/// Stored as string in the DB — readable in queries and stable across enum-order changes.
/// </summary>
public enum ProductUnit
{
    Kg,
    Gram,
    Liter,
    Milliliter,
    Piece,
}
