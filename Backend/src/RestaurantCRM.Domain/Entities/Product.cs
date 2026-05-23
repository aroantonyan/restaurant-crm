using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// An inventory item (raw material the restaurant stocks): bread, chicken, olive oil…
/// Distinct from MenuItem — a single menu item can be composed of many products
/// (recipe / BOM is a planned future feature).
///
/// CurrentStock is a denormalized cache kept in sync with the sum of signed
/// StockMovement.QuantityChange rows by InventoryService inside a transaction.
/// We pay an O(1) read cost for stock queries instead of summing the log every time.
///
/// Archive (soft-delete) instead of hard-delete: historical movement rows reference
/// this product, and reports on past purchases must keep the product name resolvable.
/// </summary>
public class Product : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public ProductUnit Unit { get; set; } = ProductUnit.Piece;

    public decimal CurrentStock { get; set; }
    public decimal LowStockThreshold { get; set; }

    public string? Notes { get; set; }
    public bool IsArchived { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<StockMovement> Movements { get; set; } = [];
}
