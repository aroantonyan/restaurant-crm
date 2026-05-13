# CLAUDE.md — Backend

ASP.NET Core 9 API for Restaurant CRM. Runs at `http://localhost:5293` in development.

The frontend lives at `../../Frontend/` (Vite + React + TypeScript). When changing DTOs, regenerate frontend types: `npm run gen:api` from the frontend directory.

## Common Commands

```bash
# Build
dotnet build Solution1.sln

# Run (from Backend/src/)
dotnet run --project RestaurantCRM.API
# → http://localhost:5293

# Add EF migration
dotnet ef migrations add <MigrationName> --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API

# Apply migrations
dotnet ef database update --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API
```

## Solution Structure

```
RestaurantCRM.Domain/          # Entities, enums — no external dependencies
RestaurantCRM.Application/     # Use cases, DTOs, interfaces (references Domain)
RestaurantCRM.Infrastructure/  # EF Core, PostgreSQL, JWT (references Application)
RestaurantCRM.API/             # Controllers, middleware, Program.cs (references Infrastructure + Application)
```

Reference flow: `API → Infrastructure → Application → Domain`

## API Endpoints

### Auth — `POST /api/auth/*` (no auth required)
- `POST /api/auth/register` — self-signup: creates Restaurant + 6 default Roles + Admin User atomically; returns JWT
- `POST /api/auth/login` — email + password → JWT
- `POST /api/auth/change-password` [Authorize] — verifies current password, sets status → Active

### Restaurant — `[Authorize]`
- `GET /api/restaurants/me` — returns current restaurant details
- `PUT /api/restaurants/me` — updates Name, LegalName, Currency, Address, Phone

### Staff — `[Authorize]`
- `GET /api/staff` — all active staff in restaurant, ordered by LastName
- `GET /api/staff/roles` — all roles with their permissions list
- `GET /api/staff/{id}` — single staff member
- `POST /api/staff` — create staff with temp password; status = PendingPasswordChange
- `PUT /api/staff/{id}` — update FirstName, LastName, FatherName, Phone, RoleId
- `DELETE /api/staff/{id}` — deactivate (sets status = Inactive, does not delete)

## Domain Entities

### User : BaseEntity, ITenantEntity
- `RestaurantId`, `RoleId` (FKs)
- `FirstName`, `LastName`, `FatherName` [max 100, required]
- `Email` [max 256, required, globally unique index]
- `PasswordHash` [required]
- `Phone?` [max 30]
- `TelegramUserId?` [long, scaffolded for future Telegram auth]
- `Status`: `UserStatus` enum — Active | Inactive | PendingPasswordChange
- `FullName` [computed, ignored by EF]

### Restaurant : BaseEntity
- `Name` [max 200, required]
- `LegalName` [max 300, required]
- `Currency` [max 10, default "AMD"]
- `Address?` [max 500], `Phone?` [max 30], `LogoUrl?` [max 1000]

### Role : BaseEntity, ITenantEntity
- `RestaurantId`, `Name` [max 100, required]
- `IsDefault` — true for the 6 seeded roles
- Unique index on (RestaurantId, Name)

### RolePermission — composite PK (RoleId, Permission)
- `Permission`: `PermissionType` enum, stored as string

### PermissionType enum (26 values across 11 categories)
Orders, Menu, Tables, Reservations, Warehouse, CashRegister, Reports, Staff, Schedules, Clients, Roles, Settings.

### Default roles (seeded per restaurant on /register)
| Role | Notable permissions |
|---|---|
| Admin | All 26 |
| Manager | All except ManageRoles, ManageRestaurantSettings, ManageSchedules |
| Waiter | ViewMenu, ViewTables, CreateOrder, EditOrder, ViewReservations, ManageReservations, ViewClients |
| Cook | ViewOrders, EditOrder, ViewMenu |
| Bartender | ViewOrders, EditOrder, ViewMenu, CreateOrder |
| Cashier | ViewOrders, ViewCashRegister, ManageCashRegister, ViewReservations, ViewClients |

## Architecture Notes

**Multi-tenancy:** Row-level. Every ITenantEntity carries `RestaurantId`. Global query filters in `AppDbContext.OnModelCreating` scope all reads automatically — populated from JWT claim via `ITenantContext`. Use `IgnoreQueryFilters()` only in auth flows where you need cross-tenant lookup (e.g., email uniqueness check on login/register).

**Auth flow:**
- Self-signup: Restaurant + 6 Roles + Admin User created in one `SaveChangesAsync` call
- Staff creation: Admin creates user with temp password; status = `PendingPasswordChange`
- JWT claims: `sub`, `email`, `jti`, `userId`, `restaurantId`, `role` — all needed for tenant context and authorization

**JWT:** 24h lifetime, no refresh tokens. Secret in `appsettings.json` (placeholder — must be changed before production).

**Errors:** plain `{ "error": "message" }` envelope. Exception → HTTP status mapping in each controller:
- `InvalidOperationException` → 409 Conflict
- `UnauthorizedAccessException` → 401 Unauthorized
- `KeyNotFoundException` → 404 Not Found

**CORS:** `UseCors` runs **before** `UseHttpsRedirection` in `Program.cs` — this is intentional. Reversing the order causes CORS preflight to receive a redirect with no CORS headers, silently breaking all browser requests while Postman still works.

**Middleware order (Program.cs):**
```
UseCors("Frontend")
UseHttpsRedirection()
UseAuthentication()
UseAuthorization()
MapControllers()
```

**SignalR:** `OrderHub` is scaffolded (clients join by `restaurantId`) but no events are emitted yet. Real-time events planned: `OrderItemSent`, `OrderItemStatusChanged`, `TableStatusChanged`, `InventoryAlert`.
