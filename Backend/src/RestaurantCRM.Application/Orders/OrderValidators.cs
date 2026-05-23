using FluentValidation;

namespace RestaurantCRM.Application.Orders;

public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.TableId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty().WithMessage("Order must have at least one item.");
        RuleForEach(x => x.Items).SetValidator(new AddOrderItemRequestValidator());
    }
}

public class AddOrderItemRequestValidator : AbstractValidator<AddOrderItemRequest>
{
    public AddOrderItemRequestValidator()
    {
        RuleFor(x => x.MenuItemId).NotEmpty();
        RuleFor(x => x.Quantity).InclusiveBetween(1, 99);
        RuleFor(x => x.Notes).MaximumLength(500).When(x => x.Notes is not null);
    }
}

public class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    private static readonly string[] ValidMethods = ["Cash", "Card", "BankTransfer", "Deposit", "Other"];

    // Only "Paid" — cancellation has its own endpoint with its own permission.
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).NotEmpty().Equal("Paid")
            .WithMessage("Status must be Paid. To cancel, call /cancel.");

        RuleFor(x => x.PaymentMethod)
            .NotEmpty().WithMessage("Payment method is required.")
            .Must(m => m is not null && ValidMethods.Contains(m))
            .WithMessage("Payment method must be Cash, Card, BankTransfer, Deposit, or Other.");
    }
}

public class UpdateOrderItemStatusRequestValidator : AbstractValidator<UpdateOrderItemStatusRequest>
{
    private static readonly string[] Valid = ["Pending", "Preparing", "Ready", "Served"];

    public UpdateOrderItemStatusRequestValidator()
    {
        RuleFor(x => x.Status).NotEmpty().Must(s => Valid.Contains(s))
            .WithMessage("Status must be Pending, Preparing, Ready, or Served.");
    }
}
