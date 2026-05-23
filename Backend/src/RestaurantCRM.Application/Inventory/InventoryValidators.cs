using FluentValidation;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Inventory;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Category).MaximumLength(100);
        RuleFor(x => x.Unit).IsInEnum();
        RuleFor(x => x.InitialStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Category).MaximumLength(100);
        RuleFor(x => x.Unit).IsInEnum();
        RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public class AddStockMovementRequestValidator : AbstractValidator<AddStockMovementRequest>
{
    public AddStockMovementRequestValidator()
    {
        // Only manual types accepted from clients — Initial is only emitted on product
        // creation, Sale is reserved for future order-driven auto-deduction.
        RuleFor(x => x.Type)
            .Must(t => t is StockMovementType.Purchase or StockMovementType.Adjustment or StockMovementType.Wastage)
            .WithMessage("Movement type must be Purchase, Adjustment, or Wastage.");

        RuleFor(x => x.QuantityChange).NotEqual(0m).WithMessage("Quantity change must not be zero.");

        // Purchases must be positive; Wastage must be negative; Adjustment allows both directions.
        RuleFor(x => x.QuantityChange)
            .GreaterThan(0).When(x => x.Type == StockMovementType.Purchase)
            .WithMessage("Purchase quantity must be positive.");

        RuleFor(x => x.QuantityChange)
            .LessThan(0).When(x => x.Type == StockMovementType.Wastage)
            .WithMessage("Wastage quantity must be negative.");

        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
