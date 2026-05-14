using FluentValidation;

namespace RestaurantCRM.Application.Tables;

public class CreateTableRequestValidator : AbstractValidator<CreateTableRequest>
{
    public CreateTableRequestValidator()
    {
        RuleFor(x => x.Number).GreaterThan(0);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 50);
    }
}

public class UpdateTableRequestValidator : AbstractValidator<UpdateTableRequest>
{
    public UpdateTableRequestValidator()
    {
        RuleFor(x => x.Number).GreaterThan(0);
        RuleFor(x => x.Capacity).InclusiveBetween(1, 50);
    }
}
