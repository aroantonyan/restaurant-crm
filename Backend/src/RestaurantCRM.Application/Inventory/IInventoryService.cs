namespace RestaurantCRM.Application.Inventory;

public interface IInventoryService
{
    Task<List<ProductDto>> GetAllAsync(string? category, bool lowStockOnly, bool includeArchived, CancellationToken ct = default);
    Task<List<string>> GetCategoriesAsync(CancellationToken ct = default);
    Task<ProductDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, Guid createdById, CancellationToken ct = default);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct = default);
    Task ArchiveAsync(Guid id, CancellationToken ct = default);

    Task<List<StockMovementDto>> GetMovementsAsync(Guid productId, int limit, CancellationToken ct = default);
    Task<ProductDto> AddMovementAsync(Guid productId, AddStockMovementRequest request, Guid createdById, CancellationToken ct = default);

    /// <summary>
    /// Records Sale-type stock deductions in bulk — used by the order-paid hook to
    /// burn ingredients per the menu item recipes. Unlike AddMovementAsync, this method
    /// permits stock to go negative because if a meal was sold, the deduction must be
    /// recorded even if the catalog count was inaccurate; a negative balance is a signal
    /// for the staff to do a stocktake.
    ///
    /// Caller is responsible for the surrounding transaction — this method only stages
    /// the entities and does NOT call SaveChangesAsync (that lets the deduction commit
    /// atomically with the Order.Status change in the same SaveChanges).
    ///
    /// Returns the IDs of products whose stock dropped to ≤ 0 after the deduction —
    /// the caller can use that list to auto-86 menu items that depend on those products.
    /// </summary>
    Task<List<Guid>> StageSaleDeductionsAsync(IEnumerable<SaleDeduction> deductions, Guid createdById, string reason, CancellationToken ct = default);
}

public record SaleDeduction(Guid ProductId, decimal Quantity);
