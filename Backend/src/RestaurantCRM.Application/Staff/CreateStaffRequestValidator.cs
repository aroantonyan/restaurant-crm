using FluentValidation;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Staff;

public class CreateStaffRequestValidator : AbstractValidator<CreateStaffRequest>
{
    private static readonly HashSet<string> ValidPermissions =
        Enum.GetNames<PermissionType>().ToHashSet();

    public CreateStaffRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FatherName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.TemporaryPassword).NotEmpty().MinimumLength(6);
        RuleFor(x => x.RoleId).NotEmpty();
        RuleFor(x => x.Phone).MaximumLength(30).When(x => x.Phone is not null);

        RuleForEach(x => x.Permissions)
            .Must(p => ValidPermissions.Contains(p))
            .WithMessage("Unknown permission: {PropertyValue}")
            .When(x => x.Permissions is not null);
    }
}
