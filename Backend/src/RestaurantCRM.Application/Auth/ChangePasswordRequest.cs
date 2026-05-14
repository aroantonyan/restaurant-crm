namespace RestaurantCRM.Application.Auth;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
