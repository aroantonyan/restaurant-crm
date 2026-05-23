using FluentValidation;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Clients;

public class CreateClientRequestValidator : AbstractValidator<CreateClientRequest>
{
    public CreateClientRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Email).MaximumLength(256).EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.LoyaltyType).IsInEnum();
        RuleFor(x => x.LoyaltyRate).InclusiveBetween(0m, 100m)
            .WithMessage("Loyalty rate must be between 0 and 100 percent.");
    }
}

public class UpdateClientRequestValidator : AbstractValidator<UpdateClientRequest>
{
    public UpdateClientRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(30);
        RuleFor(x => x.Email).MaximumLength(256).EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.LoyaltyType).IsInEnum();
        RuleFor(x => x.LoyaltyRate).InclusiveBetween(0m, 100m);
    }
}

public class ClientDepositRequestValidator : AbstractValidator<ClientDepositRequest>
{
    public ClientDepositRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than zero.");
        // Deposit method is one of the physical-payment methods — `Deposit` itself
        // doesn't make sense here (can't pay a deposit with a deposit).
        RuleFor(x => x.Method)
            .Must(m => m is PaymentMethod.Cash or PaymentMethod.Card or PaymentMethod.BankTransfer)
            .WithMessage("Method must be Cash, Card, or BankTransfer.");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

public class ClientWithdrawalRequestValidator : AbstractValidator<ClientWithdrawalRequest>
{
    public ClientWithdrawalRequestValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than zero.");
        RuleFor(x => x.Method)
            .Must(m => m is PaymentMethod.Cash or PaymentMethod.Card or PaymentMethod.BankTransfer)
            .WithMessage("Method must be Cash, Card, or BankTransfer.");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}
