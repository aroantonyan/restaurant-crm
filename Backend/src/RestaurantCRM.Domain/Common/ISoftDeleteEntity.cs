namespace RestaurantCRM.Domain.Common;

/// <summary>
/// Marks an entity as soft-deletable. EF Core query filters in AppDbContext exclude
/// deleted rows automatically; use IgnoreQueryFilters() when an audit/report needs them.
/// </summary>
public interface ISoftDeleteEntity
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}
