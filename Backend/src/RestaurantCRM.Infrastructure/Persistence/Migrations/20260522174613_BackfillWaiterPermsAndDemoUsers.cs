using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantCRM.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Two backfills in one migration:
    ///
    /// 1. Grant Waiter role ViewOrders + MoveOrderItems in every existing
    ///    restaurant. Without these, a waiter who creates an order can't see
    ///    it or mark items served. New restaurants get them via DefaultRolePermissions.Map.
    ///
    /// 2. Seed one demo user per non-Admin role per restaurant so the new
    ///    permission model can be exercised in the UI. Demo users have
    ///    Status = PendingPasswordChange so they're forced to set a real password
    ///    on first login.
    ///
    /// Demo logins (all temp passwords are the role name + "123"):
    ///   manager-{restId8}@demo.local    / manager123
    ///   waiter-{restId8}@demo.local     / waiter123
    ///   cook-{restId8}@demo.local       / cook123
    ///   bartender-{restId8}@demo.local  / bartender123
    ///   cashier-{restId8}@demo.local    / cashier123
    /// where {restId8} is the first 8 hex chars of the restaurant id.
    ///
    /// Password hashes were produced with ASP.NET Identity PasswordHasher v3
    /// (PBKDF2 SHA-256, 100,000 iterations). Each hash carries its own salt.
    /// </summary>
    public partial class BackfillWaiterPermsAndDemoUsers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ---- 1. Grant Waiter the missing permissions ----
            migrationBuilder.Sql(@"
                INSERT INTO ""RolePermissions"" (""RoleId"", ""Permission"")
                SELECT r.""Id"", perm
                FROM ""Roles"" r,
                     (VALUES ('ViewOrders'), ('MoveOrderItems')) AS p(perm)
                WHERE r.""Name"" = 'Waiter'
                  AND NOT EXISTS (
                    SELECT 1 FROM ""RolePermissions"" rp
                    WHERE rp.""RoleId"" = r.""Id"" AND rp.""Permission"" = p.perm
                  );
            ");

            // ---- 2. Seed demo users ----
            const string demoSeedTemplate = @"
                INSERT INTO ""Users"" (
                    ""Id"", ""CreatedAt"", ""RestaurantId"", ""RoleId"",
                    ""FirstName"", ""LastName"", ""FatherName"", ""Email"",
                    ""PasswordHash"", ""Status""
                )
                SELECT
                    gen_random_uuid(),
                    NOW() AT TIME ZONE 'UTC',
                    r.""Id"",
                    role.""Id"",
                    'Demo',
                    {0},
                    'Account',
                    {1} || '-' || SUBSTRING(REPLACE(r.""Id""::text, '-', ''), 1, 8) || '@demo.local',
                    {2},
                    'PendingPasswordChange'
                FROM ""Roles"" role
                JOIN ""Restaurants"" r ON r.""Id"" = role.""RestaurantId""
                WHERE role.""Name"" = {3}
                  AND NOT EXISTS (
                    SELECT 1 FROM ""Users"" u
                    WHERE u.""Email"" = {1} || '-' || SUBSTRING(REPLACE(r.""Id""::text, '-', ''), 1, 8) || '@demo.local'
                  );
            ";

            // (LastName, EmailPrefix, PasswordHash, RoleName)
            var demoRows = new (string, string, string, string)[]
            {
                ("'Manager'",   "'manager'",   "'AQAAAAEAACcQAAAAEEm54Iw/it+zJ+1MS51trv8cJ1fw/eM0clq6GagBBG2HA2eKuQ79knaLe0BPa24uRQ=='", "'Manager'"),
                ("'Waiter'",    "'waiter'",    "'AQAAAAEAACcQAAAAEP6xqMhznQYqlWGdH4Y+9hU0Miwb0RHvwUEfQon1w3hIqjb4kSmbUOSMu1LicMg5Xw=='", "'Waiter'"),
                ("'Cook'",      "'cook'",      "'AQAAAAEAACcQAAAAEAUPMgWAOrAPBYyK691ch5bLVHZhGxpE8gnPCGQmXGHOd0wt7x7qzC9ekVm9fYH6rQ=='", "'Cook'"),
                ("'Bartender'", "'bartender'", "'AQAAAAEAACcQAAAAEPIOA+F86C6b88dI4l7kFV+rkhw7+ic2cVLPq0m46XNhm8B4eXiAD8NRkEQN77+FCQ=='", "'Bartender'"),
                ("'Cashier'",   "'cashier'",   "'AQAAAAEAACcQAAAAEJ1oXJyZ7/YJaKUpjM4qoZ6I7+9fKEPeaXSzxVLj1bVK/Yry3QwWt2Aq1D+Jl4NfFQ=='", "'Cashier'"),
            };

            foreach (var (lastName, prefix, hash, role) in demoRows)
            {
                migrationBuilder.Sql(string.Format(demoSeedTemplate, lastName, prefix, hash, role));
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM ""Users"" WHERE ""Email"" LIKE '%@demo.local';
                DELETE FROM ""RolePermissions"" rp
                USING ""Roles"" r
                WHERE rp.""RoleId"" = r.""Id""
                  AND r.""Name"" = 'Waiter'
                  AND rp.""Permission"" IN ('ViewOrders', 'MoveOrderItems');
            ");
        }
    }
}
