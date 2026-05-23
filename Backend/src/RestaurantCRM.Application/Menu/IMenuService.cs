namespace RestaurantCRM.Application.Menu;

public interface IMenuService
{
    Task<List<MenuCategoryDto>> GetAllAsync(CancellationToken ct = default);
    Task<MenuCategoryDto> CreateCategoryAsync(CreateCategoryRequest request, CancellationToken ct = default);
    Task<MenuCategoryDto> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request, CancellationToken ct = default);
    Task DeleteCategoryAsync(Guid id, CancellationToken ct = default);
    Task<MenuItemDto> CreateItemAsync(CreateMenuItemRequest request, CancellationToken ct = default);
    Task<MenuItemDto> UpdateItemAsync(Guid id, UpdateMenuItemRequest request, CancellationToken ct = default);
    Task<MenuItemDto> ToggleAvailabilityAsync(Guid id, CancellationToken ct = default);
    Task DeleteItemAsync(Guid id, CancellationToken ct = default);

    // Recipe (BOM)
    Task<RecipeDto> GetRecipeAsync(Guid menuItemId, CancellationToken ct = default);
    Task<RecipeDto> SetRecipeAsync(Guid menuItemId, SetRecipeRequest request, CancellationToken ct = default);
}
