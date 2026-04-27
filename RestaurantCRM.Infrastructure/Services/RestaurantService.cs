using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Restaurants;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class RestaurantService(AppDbContext db, ITenantContext tenant) : IRestaurantService
{
    public async Task<RestaurantDto> GetAsync(CancellationToken ct = default)
    {
        var restaurant = await db.Restaurants
            .FirstOrDefaultAsync(r => r.Id == tenant.RestaurantId, ct)
            ?? throw new KeyNotFoundException("Restaurant not found.");

        return ToDto(restaurant);
    }

    public async Task<RestaurantDto> UpdateAsync(UpdateRestaurantRequest request, CancellationToken ct = default)
    {
        var restaurant = await db.Restaurants
            .FirstOrDefaultAsync(r => r.Id == tenant.RestaurantId, ct)
            ?? throw new KeyNotFoundException("Restaurant not found.");

        restaurant.Name = request.Name;
        restaurant.LegalName = request.LegalName;
        restaurant.Currency = request.Currency;
        restaurant.Address = request.Address;
        restaurant.Phone = request.Phone;

        await db.SaveChangesAsync(ct);
        return ToDto(restaurant);
    }

    private static RestaurantDto ToDto(Domain.Entities.Restaurant r) =>
        new(r.Id, r.Name, r.LegalName, r.Currency, r.Address, r.Phone, r.LogoUrl);
}
