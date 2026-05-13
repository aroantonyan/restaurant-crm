using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Common;

namespace RestaurantCRM.Infrastructure.Persistence;

internal static class TenantFilterExtension
{
    internal static void AddTenantFilter(this EntityTypeBuilder builder, ITenantContext tenantContext)
    {
        var clrType = builder.Metadata.ClrType;
        var param = Expression.Parameter(clrType, "e");
        var restaurantIdProp = Expression.Property(param, nameof(ITenantEntity.RestaurantId));

        // () => tenantContext.RestaurantId  — evaluated at query time via closure
        var tenantIdExpr = Expression.Property(
            Expression.Constant(tenantContext),
            nameof(ITenantContext.RestaurantId));

        var body = Expression.Equal(restaurantIdProp, tenantIdExpr);
        var lambda = Expression.Lambda(body, param);

        builder.HasQueryFilter(lambda);
    }
}
