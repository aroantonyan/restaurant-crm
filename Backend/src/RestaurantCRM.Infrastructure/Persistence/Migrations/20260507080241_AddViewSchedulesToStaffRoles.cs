using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantCRM.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddViewSchedulesToStaffRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add ViewSchedules permission to existing Waiter, Cook, Bartender, and Cashier
            // roles that were seeded before this permission was added to DefaultRolePermissions.
            migrationBuilder.Sql(@"
                INSERT INTO ""RolePermissions"" (""RoleId"", ""Permission"")
                SELECT r.""Id"", 'ViewSchedules'
                FROM ""Roles"" r
                WHERE r.""Name"" IN ('Waiter', 'Cook', 'Bartender', 'Cashier')
                  AND r.""IsDefault"" = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM ""RolePermissions"" rp
                      WHERE rp.""RoleId"" = r.""Id""
                        AND rp.""Permission"" = 'ViewSchedules'
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM ""RolePermissions""
                WHERE ""Permission"" = 'ViewSchedules'
                  AND ""RoleId"" IN (
                      SELECT ""Id"" FROM ""Roles""
                      WHERE ""Name"" IN ('Waiter', 'Cook', 'Bartender', 'Cashier')
                        AND ""IsDefault"" = TRUE
                  );
            ");
        }
    }
}
