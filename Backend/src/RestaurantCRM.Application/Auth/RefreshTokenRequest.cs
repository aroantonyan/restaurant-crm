using FluentValidation;

namespace RestaurantCRM.Application.Auth;

// Used by both POST /auth/refresh (rotate) and POST /auth/logout (revoke).
public record RefreshTokenRequest(string RefreshToken);

public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty().MaximumLength(200);
    }
}
