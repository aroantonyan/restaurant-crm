using FluentValidation;

namespace RestaurantCRM.Application.Tables;

public class CreateTableRequestValidator : AbstractValidator<CreateTableRequest>
{
    public CreateTableRequestValidator()
    {
        RuleFor(x => x.Number).GreaterThan(0);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 50);
        RuleFor(x => x.VipAmount).GreaterThanOrEqualTo(0).LessThan(100_000_000);
        RuleFor(x => x.VipAmount).GreaterThan(0).When(x => x.IsVip)
            .WithMessage("A VIP table needs an amount greater than zero.");
    }
}

public class UpdateTableRequestValidator : AbstractValidator<UpdateTableRequest>
{
    public UpdateTableRequestValidator()
    {
        RuleFor(x => x.Number).GreaterThan(0);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 50);
        RuleFor(x => x.VipAmount).GreaterThanOrEqualTo(0).LessThan(100_000_000);
        RuleFor(x => x.VipAmount).GreaterThan(0).When(x => x.IsVip)
            .WithMessage("A VIP table needs an amount greater than zero.");
    }
}

public class UpdateTableStatusRequestValidator : AbstractValidator<UpdateTableStatusRequest>
{
    private static readonly string[] Valid = ["Free", "Occupied", "Reserved"];

    public UpdateTableStatusRequestValidator()
    {
        RuleFor(x => x.Status).NotEmpty().Must(s => Valid.Contains(s))
            .WithMessage("Status must be Free, Occupied, or Reserved.");
    }
}
