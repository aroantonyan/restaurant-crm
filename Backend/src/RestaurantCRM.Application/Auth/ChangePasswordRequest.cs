using System.ComponentModel.DataAnnotations;

namespace RestaurantCRM.Application.Auth;

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required][MinLength(6)] string NewPassword
);
