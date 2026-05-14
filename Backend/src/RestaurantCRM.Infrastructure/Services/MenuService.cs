using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Menu;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class MenuService(AppDbContext db) : IMenuService
{
    public async Task<List<MenuCategoryDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.MenuCategories
            .Include(c => c.Items)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => ToDto(c))
            .ToListAsync(ct);
    }

    public async Task<MenuCategoryDto> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken ct = default)
    {
        var category = new MenuCategory
        {
            RestaurantId = db.MenuCategories.Local.FirstOrDefault()?.RestaurantId
                           ?? (await db.MenuCategories.FirstOrDefaultAsync(ct))?.RestaurantId
                           ?? await GetRestaurantIdAsync(ct),
            Name = request.Name,
            SortOrder = request.SortOrder,
        };
        db.MenuCategories.Add(category);
        await db.SaveChangesAsync(ct);
        category.Items = [];
        return ToDto(category);
    }

    public async Task<MenuCategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, CancellationToken ct = default)
    {
        var category = await db.MenuCategories.Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Category not found.");

        category.Name = request.Name;
        category.SortOrder = request.SortOrder;
        await db.SaveChangesAsync(ct);
        return ToDto(category);
    }

    public async Task DeleteCategoryAsync(Guid id, CancellationToken ct = default)
    {
        var category = await db.MenuCategories.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Category not found.");
        db.MenuCategories.Remove(category);
        await db.SaveChangesAsync(ct);
    }

    public async Task<MenuItemDto> CreateItemAsync(CreateMenuItemRequest request, CancellationToken ct = default)
    {
        var category = await db.MenuCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId, ct)
            ?? throw new KeyNotFoundException("Category not found.");

        var item = new MenuItem
        {
            RestaurantId = category.RestaurantId,
            CategoryId = category.Id,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            PhotoUrl = request.PhotoUrl,
            IsAvailable = request.IsAvailable,
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync(ct);
        item.Category = category;
        return ToItemDto(item);
    }

    public async Task<MenuItemDto> UpdateItemAsync(Guid id, UpdateMenuItemRequest request, CancellationToken ct = default)
    {
        var item = await db.MenuItems.Include(i => i.Category)
            .FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException("Menu item not found.");

        if (item.CategoryId != request.CategoryId)
        {
            var newCategory = await db.MenuCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId, ct)
                ?? throw new KeyNotFoundException("Category not found.");
            item.CategoryId = newCategory.Id;
            item.Category = newCategory;
        }

        item.Name = request.Name;
        item.Description = request.Description;
        item.Price = request.Price;
        item.PhotoUrl = request.PhotoUrl;
        item.IsAvailable = request.IsAvailable;
        await db.SaveChangesAsync(ct);
        return ToItemDto(item);
    }

    public async Task<MenuItemDto> ToggleAvailabilityAsync(Guid id, CancellationToken ct = default)
    {
        var item = await db.MenuItems.Include(i => i.Category)
            .FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException("Menu item not found.");

        item.IsAvailable = !item.IsAvailable;
        await db.SaveChangesAsync(ct);
        return ToItemDto(item);
    }

    public async Task DeleteItemAsync(Guid id, CancellationToken ct = default)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new KeyNotFoundException("Menu item not found.");
        db.MenuItems.Remove(item);
        await db.SaveChangesAsync(ct);
    }

    // ---- helpers ----

    private async Task<Guid> GetRestaurantIdAsync(CancellationToken ct)
    {
        // ITenantContext global filter ensures we only see our restaurant's data,
        // but for inserts we need the RestaurantId — read it from any existing entity.
        var restaurant = await db.Restaurants.FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("Restaurant not found.");
        return restaurant.Id;
    }

    private static MenuCategoryDto ToDto(MenuCategory c) =>
        new(c.Id, c.Name, c.SortOrder, c.Items.Select(ToItemDto).ToList());

    private static MenuItemDto ToItemDto(MenuItem i) =>
        new(i.Id, i.CategoryId, i.Category.Name, i.Name, i.Description, i.Price, i.PhotoUrl, i.IsAvailable);
}
