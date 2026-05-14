namespace RestaurantCRM.Application.Auth;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string FatherName,
    string Email,
    string Password,
    string RestaurantName
);
