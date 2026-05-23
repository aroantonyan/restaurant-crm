using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Infrastructure.Persistence;

internal static class QueryFilterExtensions
{
    /// <summary>
    /// Applies the entity's default query filters in one call:
    ///   • tenant scope (every query is restricted to the caller's restaurant)
    ///   • soft-delete (rows with IsDeleted=true are hidden by default)
    ///
    /// EF Core allows ONE HasQueryFilter per entity, so both predicates must be
    /// combined into a single lambda. Use IgnoreQueryFilters() to opt out.
    /// </summary>
    internal static void ApplyDefaultFilters(this EntityTypeBuilder builder, ITenantContext tenantContext)
    {
        var clrType = builder.Metadata.ClrType;
        var isTenant = typeof(ITenantEntity).IsAssignableFrom(clrType);
        var isSoftDelete = typeof(ISoftDeleteEntity).IsAssignableFrom(clrType);
        if (!isTenant && !isSoftDelete) return;

        var param = Expression.Parameter(clrType, "e");
        Expression? body = null;

        if (isTenant)
        {
            // e.RestaurantId == tenantContext.RestaurantId   (re-evaluated per query)
            var restaurantIdProp = Expression.Property(param, nameof(ITenantEntity.RestaurantId));
            var tenantIdExpr = Expression.Property(
                Expression.Constant(tenantContext),
                nameof(ITenantContext.RestaurantId));
            body = Expression.Equal(restaurantIdProp, tenantIdExpr);
        }

        if (isSoftDelete)
        {
            // !e.IsDeleted
            var isDeletedProp = Expression.Property(param, nameof(ISoftDeleteEntity.IsDeleted));
            var notDeleted = Expression.Not(isDeletedProp);
            body = body is null ? notDeleted : Expression.AndAlso(body, notDeleted);
        }

        if (body is null) return;
        builder.HasQueryFilter(Expression.Lambda(body, param));
    }
}
