using System.ComponentModel.DataAnnotations;

namespace RestaurantCRM.Application.Auth;

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);
