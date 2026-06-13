using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Inventory;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Inventory operations. All stock-changing methods run their two writes
/// (product.CurrentStock update + new StockMovement row) inside a single
/// SaveChangesAsync — EF Core wraps that in an implicit transaction, so
/// the cached counter can never drift from the audit log.
/// </summary>
public class InventoryService(
    AppDbContext db,
    ITenantContext tenant,
    IRealtimeNotifier notifier,
    IActivityLogService activityLog) : IInventoryService
{
    public async Task<List<ProductDto>> GetAllAsync(string? category, bool lowStockOnly, bool includeArchived, CancellationToken ct = default)
    {
        var query = db.Products.AsQueryable();

        if (!includeArchived) query = query.Where(p => !p.IsArchived);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(p => p.Category == category);
        if (lowStockOnly) query = query.Where(p => p.CurrentStock <= p.LowStockThreshold);

        var products = await query
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        return products.Select(ToDto).ToList();
    }

    public async Task<List<string>> GetCategoriesAsync(CancellationToken ct = default)
    {
        // Distinct list — empty strings filtered out client- and server-side.
        return await db.Products
            .Where(p => !p.IsArchived && p.Category != null && p.Category != "")
            .Select(p => p.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);
    }

    public async Task<ProductDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Product not found.");
        return ToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, Guid createdById, CancellationToken ct = default)
    {
        // Guard: name must be unique within the restaurant. Reduces duplicate-catalog mess.
        var nameTaken = await db.Products
            .AnyAsync(p => !p.IsArchived && p.Name.ToLower() == request.Name.Trim().ToLower(), ct);
        if (nameTaken)
            throw new InvalidOperationException("A product with this name already exists.");

        var product = new Product
        {
            RestaurantId = tenant.RestaurantId,
            Name = request.Name.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim(),
            Unit = request.Unit,
            CurrentStock = request.InitialStock,
            LowStockThreshold = request.LowStockThreshold,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        db.Products.Add(product);

        // Record the opening balance as the first movement (even if zero) — gives every
        // product a complete audit trail starting at row 1.
        db.StockMovements.Add(new StockMovement
        {
            RestaurantId = tenant.RestaurantId,
            ProductId = product.Id,
            CreatedById = createdById,
            Type = StockMovementType.Initial,
            QuantityChange = request.InitialStock,
            QuantityAfter = request.InitialStock,
            Reason = "Opening balance",
        });

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(createdById, ActivityCategory.Inventory, "ProductCreated", nameof(Product), product.Id,
            $"Product '{product.Name}' created with {product.CurrentStock} {product.Unit} initial stock", ct);

        await notifier.ProductChanged(product.Id, ct);
        return ToDto(product);
    }

    public async Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Product not found.");

        if (product.IsArchived)
            throw new InvalidOperationException("This product is archived and cannot be edited.");

        var newName = request.Name.Trim();
        if (!string.Equals(product.Name, newName, StringComparison.OrdinalIgnoreCase))
        {
            var nameTaken = await db.Products
                .AnyAsync(p => p.Id != id && !p.IsArchived && p.Name.ToLower() == newName.ToLower(), ct);
            if (nameTaken)
                throw new InvalidOperationException("A product with this name already exists.");
        }

        product.Name = newName;
        product.Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();
        product.Unit = request.Unit;
        product.LowStockThreshold = request.LowStockThreshold;
        product.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Inventory, "ProductUpdated", nameof(Product), product.Id,
            $"Product '{product.Name}' updated", ct);

        await notifier.ProductChanged(product.Id, ct);
        return ToDto(product);
    }

    public async Task ArchiveAsync(Guid id, CancellationToken ct = default)
    {
        // Soft archive — historical movements still reference this row; reports depend on it.
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Product not found.");

        if (product.IsArchived) return; // idempotent

        product.IsArchived = true;
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Inventory, "ProductArchived", nameof(Product), product.Id,
            $"Product '{product.Name}' archived", ct);

        await notifier.ProductChanged(product.Id, ct);
    }

    public async Task<List<StockMovementDto>> GetMovementsAsync(Guid productId, int limit, CancellationToken ct = default)
    {
        // Verify product belongs to this tenant before exposing movement history.
        var exists = await db.Products.AnyAsync(p => p.Id == productId, ct);
        if (!exists) throw new KeyNotFoundException("Product not found.");

        var movements = await db.StockMovements
            .Include(m => m.CreatedBy)
            .Where(m => m.ProductId == productId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return movements.Select(m => new StockMovementDto(
            m.Id, m.ProductId, m.Type, m.QuantityChange, m.QuantityAfter,
            m.Reason, m.CreatedBy.FullName, m.CreatedAt
        )).ToList();
    }

    public async Task<ProductDto> AddMovementAsync(Guid productId, AddStockMovementRequest request, Guid createdById, CancellationToken ct = default)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == productId, ct)
            ?? throw new KeyNotFoundException("Product not found.");

        if (product.IsArchived)
            throw new InvalidOperationException("This product is archived and cannot accept new movements.");

        // Discrete units (pieces, grams, ml) can't be fractional — reject 0.5 of a piece.
        if (IsDiscreteUnit(product.Unit) && request.QuantityChange != Math.Truncate(request.QuantityChange))
            throw new InvalidOperationException($"{product.Unit} quantities must be whole numbers.");

        var newStock = product.CurrentStock + request.QuantityChange;
        if (newStock < 0)
            throw new InvalidOperationException("Stock cannot go negative.");

        product.CurrentStock = newStock;

        db.StockMovements.Add(new StockMovement
        {
            RestaurantId = tenant.RestaurantId,
            ProductId = product.Id,
            CreatedById = createdById,
            Type = request.Type,
            QuantityChange = request.QuantityChange,
            QuantityAfter = newStock,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
        });

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(createdById, ActivityCategory.Inventory, request.Type.ToString(),
            nameof(Product), product.Id,
            $"{request.Type} of {Math.Abs(request.QuantityChange)} {product.Unit} for '{product.Name}' (new stock: {newStock})", ct);

        await notifier.ProductChanged(product.Id, ct);
        return ToDto(product);
    }

    public async Task<List<Guid>> StageSaleDeductionsAsync(IEnumerable<SaleDeduction> deductions, Guid createdById, string reason, CancellationToken ct = default)
    {
        // Batch lookup — one query for all referenced products.
        var byProductQuantity = deductions
            .GroupBy(d => d.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(d => d.Quantity));

        if (byProductQuantity.Count == 0) return [];

        var ids = byProductQuantity.Keys.ToList();
        var products = await db.Products
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(ct);

        foreach (var product in products)
        {
            if (!byProductQuantity.TryGetValue(product.Id, out var qty)) continue;

            // Sale movements decrement stock. Unlike manual AddMovementAsync, we allow
            // negative balances here — denying the deduction would falsify the audit log.
            product.CurrentStock -= qty;

            db.StockMovements.Add(new StockMovement
            {
                RestaurantId = tenant.RestaurantId,
                ProductId = product.Id,
                CreatedById = createdById,
                Type = StockMovementType.Sale,
                QuantityChange = -qty,
                QuantityAfter = product.CurrentStock,
                Reason = reason,
            });
        }

        // No SaveChangesAsync here — caller controls the transaction so the deductions
        // commit atomically with the Order.Status change.

        // Report which products now have non-positive stock so the caller can auto-86
        // menu items that depend on them.
        return products
            .Where(p => p.CurrentStock <= 0)
            .Select(p => p.Id)
            .ToList();
    }

    // Whole-count units: a half piece / half gram / half ml is meaningless.
    // Kg and Liter are the only divisible units.
    private static bool IsDiscreteUnit(ProductUnit unit) =>
        unit is ProductUnit.Piece or ProductUnit.Gram or ProductUnit.Milliliter;

    private static ProductDto ToDto(Product p) => new(
        p.Id,
        p.Name,
        p.Category,
        p.Unit,
        p.CurrentStock,
        p.LowStockThreshold,
        IsLowStock: p.CurrentStock <= p.LowStockThreshold,
        p.Notes,
        p.IsArchived,
        p.CreatedAt,
        p.UpdatedAt);
}
