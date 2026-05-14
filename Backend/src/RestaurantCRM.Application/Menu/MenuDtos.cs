namespace RestaurantCRM.Application.Menu;

public record MenuCategoryDto(
    Guid Id,
    string Name,
    int SortOrder,
    List<MenuItemDto> Items
);

public record MenuItemDto(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    decimal Price,
    string? PhotoUrl,
    bool IsAvailable
);

public record CreateCategoryRequest(string Name, int SortOrder = 0);

public record UpdateCategoryRequest(string Name, int SortOrder);

public record CreateMenuItemRequest(
    Guid CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? PhotoUrl,
    bool IsAvailable = true
);

public record UpdateMenuItemRequest(
    Guid CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? PhotoUrl,
    bool IsAvailable
);
