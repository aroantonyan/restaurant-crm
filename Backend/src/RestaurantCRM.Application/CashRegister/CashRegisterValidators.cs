using FluentValidation;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.CashRegister;

public class RecordManualOpRequestValidator : AbstractValidator<RecordManualOpRequest>
{
    public RecordManualOpRequestValidator()
    {
        // Only manual types accepted from this endpoint. OrderPayment/Refund are
        // emitted by the order flow, never by the user directly.
        RuleFor(x => x.Type)
            .Must(t => t is CashTransactionType.ManualIncome or CashTransactionType.ManualExpense)
            .WithMessage("Type must be ManualIncome or ManualExpense.");

        // Always a positive client-supplied amount; the server applies the sign.
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Amount must be greater than zero.");

        // Reason is mandatory — the doc explicitly calls this out as a cash discipline rule.
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Reason is required for manual cash operations.")
            .MaximumLength(500);
    }
}
