using System.ComponentModel.DataAnnotations;

namespace RestaurantCRM.Application.Auth;

public record RegisterRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required] string FatherName,
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password,
    [Required] string RestaurantName
);
