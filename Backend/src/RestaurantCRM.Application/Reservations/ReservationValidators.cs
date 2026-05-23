using FluentValidation;

namespace RestaurantCRM.Application.Reservations;

public class CreateReservationRequestValidator : AbstractValidator<CreateReservationRequest>
{
    public CreateReservationRequestValidator()
    {
        RuleFor(x => x.TableId).NotEmpty();
        RuleFor(x => x.GuestName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.GuestPhone).MaximumLength(30).When(x => x.GuestPhone is not null);
        RuleFor(x => x.GuestCount).InclusiveBetween(1, 50);
        RuleFor(x => x.StartAt).NotEmpty();
        RuleFor(x => x.DurationMinutes).InclusiveBetween(15, 600); // 15 min .. 10 h
        RuleFor(x => x.Notes).MaximumLength(500).When(x => x.Notes is not null);
    }
}

public class UpdateReservationRequestValidator : AbstractValidator<UpdateReservationRequest>
{
    public UpdateReservationRequestValidator()
    {
        RuleFor(x => x.TableId).NotEmpty();
        RuleFor(x => x.GuestName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.GuestPhone).MaximumLength(30).When(x => x.GuestPhone is not null);
        RuleFor(x => x.GuestCount).InclusiveBetween(1, 50);
        RuleFor(x => x.StartAt).NotEmpty();
        RuleFor(x => x.DurationMinutes).InclusiveBetween(15, 600);
        RuleFor(x => x.Notes).MaximumLength(500).When(x => x.Notes is not null);
    }
}

public class UpdateReservationStatusRequestValidator : AbstractValidator<UpdateReservationStatusRequest>
{
    public UpdateReservationStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}
