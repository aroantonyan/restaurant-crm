using FluentValidation;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Staff;

public class SetPermissionsRequestValidator : AbstractValidator<SetPermissionsRequest>
{
    private static readonly HashSet<string> ValidPermissions =
        Enum.GetNames<PermissionType>().ToHashSet();

    public SetPermissionsRequestValidator()
    {
        RuleFor(x => x.Permissions).NotNull();

        RuleForEach(x => x.Permissions)
            .Must(p => ValidPermissions.Contains(p))
            .WithMessage("Unknown permission: {PropertyValue}");
    }
}
