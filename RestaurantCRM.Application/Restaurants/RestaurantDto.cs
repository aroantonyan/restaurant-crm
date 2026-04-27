namespace RestaurantCRM.Application.Restaurants;

public record RestaurantDto(
    Guid Id,
    string Name,
    string LegalName,
    string Currency,
    string? Address,
    string? Phone,
    string? LogoUrl
);

public record UpdateRestaurantRequest(
    string Name,
    string LegalName,
    string Currency,
    string? Address,
    string? Phone
);
