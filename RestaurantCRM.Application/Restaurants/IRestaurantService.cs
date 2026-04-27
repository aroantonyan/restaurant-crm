namespace RestaurantCRM.Application.Restaurants;

public interface IRestaurantService
{
    Task<RestaurantDto> GetAsync(CancellationToken ct = default);
    Task<RestaurantDto> UpdateAsync(UpdateRestaurantRequest request, CancellationToken ct = default);
}
