using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantCRM.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Backfill: grant ViewActivityLog to existing Admin and Manager roles in every
    /// restaurant. Without this, restaurants seeded before this migration would have
    /// no one able to read the audit log. Newly-registered restaurants get the
    /// permission via DefaultRolePermissions.Map on /register.
    /// </summary>
    public partial class SeedViewActivityLogPermission : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                INSERT INTO ""RolePermissions"" (""RoleId"", ""Permission"")
                SELECT r.""Id"", 'ViewActivityLog'
                FROM ""Roles"" r
                WHERE r.""Name"" IN ('Admin', 'Manager')
                  AND NOT EXISTS (
                    SELECT 1 FROM ""RolePermissions"" rp
                    WHERE rp.""RoleId"" = r.""Id"" AND rp.""Permission"" = 'ViewActivityLog'
                  );
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM ""RolePermissions""
                WHERE ""Permission"" = 'ViewActivityLog';
            ");
        }
    }
}
