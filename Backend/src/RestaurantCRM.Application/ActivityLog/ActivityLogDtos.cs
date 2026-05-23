using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.ActivityLog;

public record ActivityLogEntryDto(
    Guid Id,
    Guid? UserId,
    string UserName,
    ActivityCategory Category,
    string Action,
    string EntityType,
    Guid? EntityId,
    string Description,
    DateTime CreatedAt);
