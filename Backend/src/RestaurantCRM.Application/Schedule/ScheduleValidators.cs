using FluentValidation;

namespace RestaurantCRM.Application.Schedule;

public class CreateShiftRequestValidator : AbstractValidator<CreateShiftRequest>
{
    public CreateShiftRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.StartAt).NotEmpty();
        RuleFor(x => x.EndAt).NotEmpty();
        // Shift must be at least 15 min and at most 16 h. Anything longer is
        // almost always a data-entry error; labor laws cap most jurisdictions
        // below 12 h anyway, but the buffer gives room for split-day weddings.
        RuleFor(x => x)
            .Must(x => x.EndAt > x.StartAt)
            .WithMessage("End time must be after start time.")
            .Must(x => (x.EndAt - x.StartAt).TotalMinutes >= 15)
            .WithMessage("Shift must be at least 15 minutes.")
            .Must(x => (x.EndAt - x.StartAt).TotalHours <= 16)
            .WithMessage("Shift cannot exceed 16 hours.");
        RuleFor(x => x.RoleForShift).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class UpdateShiftRequestValidator : AbstractValidator<UpdateShiftRequest>
{
    public UpdateShiftRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.StartAt).NotEmpty();
        RuleFor(x => x.EndAt).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.EndAt > x.StartAt)
            .WithMessage("End time must be after start time.")
            .Must(x => (x.EndAt - x.StartAt).TotalMinutes >= 15)
            .WithMessage("Shift must be at least 15 minutes.")
            .Must(x => (x.EndAt - x.StartAt).TotalHours <= 16)
            .WithMessage("Shift cannot exceed 16 hours.");
        RuleFor(x => x.RoleForShift).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(500);
        RuleFor(x => x.Status).IsInEnum();
    }
}
