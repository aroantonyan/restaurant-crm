using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Inventory;

public record ProductDto(
    Guid Id,
    string Name,
    string? Category,
    ProductUnit Unit,
    decimal CurrentStock,
    decimal LowStockThreshold,
    bool IsLowStock,
    string? Notes,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record StockMovementDto(
    Guid Id,
    Guid ProductId,
    StockMovementType Type,
    decimal QuantityChange,
    decimal QuantityAfter,
    string? Reason,
    string CreatedByName,
    DateTime CreatedAt);

public record CreateProductRequest(
    string Name,
    string? Category,
    ProductUnit Unit,
    decimal InitialStock,
    decimal LowStockThreshold,
    string? Notes);

public record UpdateProductRequest(
    string Name,
    string? Category,
    ProductUnit Unit,
    decimal LowStockThreshold,
    string? Notes);

/// <summary>
/// Movement input. Type must be one of the manual types (Purchase, Adjustment, Wastage).
/// Initial / Sale are reserved for system use and rejected by the validator.
/// QuantityChange is signed by the client — positive adds stock, negative removes it.
/// </summary>
public record AddStockMovementRequest(
    StockMovementType Type,
    decimal QuantityChange,
    string? Reason);
