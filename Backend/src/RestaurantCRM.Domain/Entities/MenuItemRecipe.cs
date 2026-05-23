using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// Junction row: one ingredient line of a menu item's recipe (BOM).
///
/// Industry pattern (Square / Toast / MarketMan): flat one-level BOM —
/// each menu item is mapped to a list of (Product, Quantity) pairs.
/// Multi-level recipes (recipes of recipes) are explicitly out of scope
/// for v1; if needed later, this entity can host an optional SubRecipeId.
///
/// `Quantity` is expressed in the product's own unit — if Olive Oil is Liter
/// then 0.05 means 50 ml of oil per serving. No unit conversion at this layer.
///
/// FK behavior is Restrict on both sides:
///   • Can't delete a MenuItem while it has recipe lines
///   • Can't delete a Product while it's used in any recipe
/// Forces a deliberate "unlink first" workflow, preventing accidental
/// data loss in production catalogs.
/// </summary>
public class MenuItemRecipe : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid MenuItemId { get; set; }
    public Guid ProductId { get; set; }

    public decimal Quantity { get; set; }

    public MenuItem MenuItem { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
