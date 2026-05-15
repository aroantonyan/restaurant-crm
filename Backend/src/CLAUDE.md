# CLAUDE.md — Backend

ASP.NET Core 9 API for Restaurant CRM. Runs at `http://localhost:5293` in development.

The frontend lives at `../../Frontend/`. When changing DTOs, regenerate frontend types: `npm run gen:api` from the frontend directory.

## Common Commands

```bash
# Build
dotnet build Solution1.sln

# Run (from Backend/src/)
dotnet run --project RestaurantCRM.API
# → http://localhost:5293

# Add EF migration
dotnet ef migrations add <Name> --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API --output-dir Persistence/Migrations

# Apply migrations
dotnet ef database update --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API
```

**IMPORTANT — all migrations live in `RestaurantCRM.Infrastructure/Persistence/Migrations/`** (namespace `RestaurantCRM.Infrastructure.Persistence.Migrations`). The old `Migrations/` folder was consolidated away. Use `--output-dir Persistence/Migrations` on `migrations add` to be safe.

## Solution Structure

```
RestaurantCRM.Domain/          # Entities, enums — no external dependencies
RestaurantCRM.Application/     # Use cases, DTOs, FluentValidation validators (references Domain)
RestaurantCRM.Infrastructure/  # EF Core, PostgreSQL, JWT, services (references Application)
RestaurantCRM.API/             # Controllers, GlobalExceptionHandler, RequirePermissionAttribute, Program.cs (references Infrastructure + Application)
```

Reference flow: `API → Infrastructure → Application → Domain`

## API Endpoints

Every endpoint requires `[Authorize]` AND a `[RequirePermission(PermissionType.X)]` filter (custom attribute in `API/Auth/`) — except `/api/auth/*` and `GET /api/restaurants/me` (caller's own restaurant).

### Auth (no auth required)
- `POST /api/auth/register` — atomic Restaurant + 6 default Roles + Admin User → JWT
- `POST /api/auth/login` — email + password → JWT (one query, Restaurant + Role + permissions all joined)
- `POST /api/auth/change-password` `[Authorize]` — verifies current password, sets status → Active

### Restaurant `[Authorize]`
- `GET /api/restaurants/me` — current restaurant (no permission required — your own data)
- `PUT /api/restaurants/me` — `ManageRestaurantSettings`

### Staff `[Authorize]`
- `GET /api/staff`, `GET /api/staff/roles`, `GET /api/staff/{id}` — `ViewStaff`
- `POST /api/staff` — `ManageStaff`, creates with `PendingPasswordChange` status
- `PUT /api/staff/{id}` — `ManageStaff`
- `DELETE /api/staff/{id}` — `ManageStaff`, deactivates (Status = Inactive, doesn't delete)

### Menu `[Authorize]`
- `GET /api/menu` — `ViewMenu`, returns categories with items nested
- `POST/PUT/DELETE /api/menu/categories[/{id}]` — `ManageMenu`
- `POST/PUT/DELETE /api/menu/items[/{id}]` — `ManageMenu`
- `PATCH /api/menu/items/{id}/toggle` — `ManageMenu`, flips IsAvailable without a full update

### Tables `[Authorize]`
- `GET /api/tables` — `ViewTables`
- `POST/PUT/DELETE /api/tables[/{id}]` — `ManageTables`

### Orders `[Authorize]`
- `GET /api/orders` — `ViewOrders`
- `GET /api/orders/{id}` — `ViewOrders`
- `POST /api/orders` — `CreateOrder`, sets `Table.Status = Occupied`
- `POST /api/orders/{id}/items`, `DELETE /api/orders/{id}/items/{itemId}` — `EditOrder`
- `PATCH /api/orders/{id}/status` — `EditOrder` (Open → Paid/Cancelled, releases table if no other open orders)
- `PATCH /api/orders/{id}/items/{itemId}/status` — `MoveOrderItems` (Pending → Preparing → Ready → Served)

## Domain Entities

### User : BaseEntity, ITenantEntity
- `RestaurantId`, `RoleId` (FKs)
- `FirstName`, `LastName`, `FatherName` [max 100, required]
- `Email` [max 256, required, globally unique index]
- `PasswordHash` [required]
- `Phone?` [max 30]
- `TelegramUserId?` [long, scaffolded for future Telegram auth]
- `Status`: `UserStatus` — Active | Inactive | PendingPasswordChange

### Restaurant : BaseEntity (NOT ITenantEntity — it IS the tenant)
- `Name` [max 200], `LegalName` [max 300]
- `Currency` [max 10, default "AMD"]
- `Address?`, `Phone?`, `LogoUrl?`

### Role : BaseEntity, ITenantEntity
- `Name` [max 100], `IsDefault`
- Unique index on (RestaurantId, Name)

### RolePermission — composite PK (RoleId, Permission)
- `Permission`: `PermissionType` enum, stored as string

### MenuCategory : BaseEntity, ITenantEntity
- `Name` [max 100], `SortOrder` (int)
- Cascades delete → MenuItem

### MenuItem : BaseEntity, ITenantEntity
- `CategoryId`, `Name` [max 200], `Description?` [max 1000]
- `Price` [decimal(18,2)]
- `PhotoUrl?` [max 1000], `IsAvailable` (default true)

### Table : BaseEntity, ITenantEntity
- `Number` (int), `Capacity` (int, default 4)
- `Status`: `TableStatus` — Free | Occupied | Reserved
- Unique index on (RestaurantId, Number)

### Order : BaseEntity, ITenantEntity
- `TableId`, `CreatedById` (User FK, Restrict — users can't be deleted while they have orders)
- `Status`: `OrderStatus` — Open | Paid | Cancelled
- Cascades delete → OrderItem

### OrderItem : BaseEntity, ITenantEntity
- `OrderId`, `MenuItemId` (Restrict — menu items can't be deleted while referenced)
- **`MenuItemName` (snapshot) + `Price` (snapshot)** — frozen at order time so price changes never alter historical totals
- `Quantity`, `Status`: `OrderItemStatus` — Pending | Preparing | Ready | Served
- `Notes?`

### Default roles (seeded per restaurant on /register)
| Role | Permissions |
|---|---|
| Admin | All 26 |
| Manager | All except ManageRoles, ManageRestaurantSettings, ManageSchedules |
| Waiter | ViewMenu, ViewTables, CreateOrder, EditOrder, ViewReservations, ManageReservations, ViewClients |
| Cook | ViewOrders, EditOrder, ViewMenu |
| Bartender | ViewOrders, EditOrder, ViewMenu, CreateOrder |
| Cashier | ViewOrders, ViewCashRegister, ManageCashRegister, ViewReservations, ViewClients |

## Architecture Notes

### Multi-tenancy
- Every `ITenantEntity` carries `RestaurantId`. Global query filters in `AppDbContext.OnModelCreating` scope all reads automatically — value read from JWT claim via `ITenantContext`.
- **For inserts, always set `RestaurantId = tenant.RestaurantId`**. Never:
  - Derive from another entity's `RestaurantId` (brittle when query filters change)
  - Read `db.Restaurants.FirstOrDefaultAsync()` (Restaurant has no tenant filter → may return wrong restaurant)
- `IgnoreQueryFilters()` only in `AuthService` for cross-tenant email uniqueness check.

### Auth flow
- Self-signup: Restaurant + 6 Roles + Admin User in one `SaveChangesAsync`
- Staff creation: temp password, status = `PendingPasswordChange`
- JWT claims: `sub`, `email`, `jti`, `userId`, `restaurantId`, `role`, `permissions` (comma-joined)
- JWT lifetime: 12h (configurable in `appsettings.json` → `JwtSettings.ExpiryHours`), no refresh

### Validation (FluentValidation)
- Every request DTO has an `AbstractValidator<T>` in the Application layer
- Registered via `AddValidatorsFromAssemblyContaining<RegisterRequestValidator>` — scans the whole Application assembly
- `AddFluentValidationAutoValidation()` plugs them into ASP.NET model binding
- Failure → 400 with `{ "error": "first message" }` (controlled by `InvalidModelStateResponseFactory`, configured *after* `AddControllers()` so it wins the options-pattern race)

### Errors (global handler)
- `GlobalExceptionHandler` implements `IExceptionHandler` (.NET 8+ pattern)
- No controller has try/catch — all exceptions bubble up
- Mapping:
  - `KeyNotFoundException` → 404
  - `InvalidOperationException` → 409
  - `UnauthorizedAccessException` → 401
  - `ArgumentException` → 400
  - anything else → 500 (logged with HTTP method + path)
- Response envelope is always `{ "error": "message" }`

### Authorization
- `[Authorize]` on controllers ensures a valid JWT
- `[RequirePermission(PermissionType.X)]` (custom `IAuthorizationFilter` in `API/Auth/`) reads the `permissions` claim and returns 403 if missing
- This means the API is protected even when the frontend gate is bypassed

### Logging (Serilog)
- `Program.cs` uses a bootstrap logger (catches startup failures), then swaps to the host-configured logger
- Sinks: Console + rolling file at `logs/log-{date}.txt` (kept 7 days)
- Levels: ASP.NET → Warning+, EF SQL → Warning+, app → Information+
- `UseSerilogRequestLogging()` emits one clean line per HTTP request

### CORS
- `UseCors` runs **before** `UseHttpsRedirection` in `Program.cs`. Reversing causes preflight requests to get a redirect with no CORS headers, silently breaking the browser while Postman still works.

### Middleware order (Program.cs)
```
UseExceptionHandler()    ← catches everything below
UseCors("Frontend")
UseHttpsRedirection()
UseSerilogRequestLogging()
UseAuthentication()
UseAuthorization()
MapControllers()
```

### Money & snapshots
- All money columns: `decimal` with `HasPrecision(18, 2)`
- `OrderItem.MenuItemName` and `OrderItem.Price` are **snapshots** captured at order creation. Editing a `MenuItem` after the fact does NOT alter past orders. This is the standard pattern for any transactional record (banks, e-commerce).

### SignalR
- `OrderHub` is scaffolded (clients join by `restaurantId`) but no events are emitted yet. Planned: `OrderItemSent`, `OrderItemStatusChanged`, `TableStatusChanged`, `InventoryAlert`.

## Common pitfalls

1. **New endpoint** — add `[RequirePermission(PermissionType.X)]` unless it's auth or own-data.
2. **New tenant entity insert** — set `RestaurantId = tenant.RestaurantId`, never from another lookup.
3. **New money field** — `decimal` + `HasPrecision(18, 2)`. Never `double`/`float`.
4. **New DTO** — add an `AbstractValidator<T>` next to it. Mirror EF max lengths.
5. **New migration** — `--output-dir Persistence/Migrations` to keep them all in one folder.
6. **No try/catch in controllers** — the global handler does the mapping.
