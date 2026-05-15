# CLAUDE.md — Restaurant CRM (root)

Monorepo for a Telegram Mini App restaurant management system targeting the Armenian market.

## Layout

```
Restaurant  CRM/
├── Backend/src/          ← ASP.NET Core 9 + PostgreSQL (see Backend/src/CLAUDE.md)
├── Frontend/             ← Vite + React 19 + TypeScript + Telegram WebApp (see Frontend/CLAUDE.md)
└── Restaurant management system.docx  ← original requirements
```

**Invoke Claude Code from this directory** (not from `Backend/src/`) so both projects are in scope. The two are tightly coupled — DTO changes on one side need mirrored changes on the other.

## End-to-end run (local dev)

```bash
# Terminal 1 — backend
cd "Backend/src" && dotnet run --project RestaurantCRM.API
# → http://localhost:5293, OpenAPI at /openapi/v1.json

# Terminal 2 — frontend (choose ONE)
cd "Frontend" && npm run dev      # dev server with HMR (port 5173) — slow inside Telegram
cd "Frontend" && npm run start    # build + preview (port 5173) — fast inside Telegram

# Terminal 3 — Telegram tunnel (only when testing inside Telegram)
cd "Frontend" && npm run tunnel
# → public HTTPS URL on port 5173 → give to @BotFather
```

**Why `npm run start` for Telegram testing:** dev mode serves hundreds of unbundled ES modules over HTTP. Each page navigation triggers 50–100+ HTTP requests, making the app feel slow inside Telegram's WebView. `npm run start` runs `vite build && vite preview` — one bundled 130 KB gzipped file. Instant page transitions.

## API proxy (important)

When testing through Telegram (ngrok = HTTPS), the frontend **cannot** call the backend directly over plain HTTP — browsers block this as mixed content. Vite (dev or preview) proxies all `/api/*` requests to `http://localhost:5293` on the server side, bypassing the restriction. `VITE_API_BASE_URL` is intentionally empty in `.env`; never set it to a localhost URL.

## Contract sync

When backend DTOs change:
1. Update the C# request DTO + matching `AbstractValidator<T>` in `RestaurantCRM.Application`
2. From `Frontend/`: `npm run gen:api` (writes `src/lib/api-types.ts` from `/openapi/v1.json`)
3. Update Zod schemas in the relevant page to mirror new validation thresholds

## What is implemented (as of now)

### Backend — endpoints
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/change-password` |
| Restaurant | `GET /api/restaurants/me`, `PUT /api/restaurants/me` |
| Staff | `GET /api/staff`, `GET /api/staff/roles`, `GET /api/staff/{id}`, `POST /api/staff`, `PUT /api/staff/{id}`, `DELETE /api/staff/{id}` |
| Menu | `GET /api/menu`, `POST/PUT/DELETE /api/menu/categories`, `POST/PUT/DELETE /api/menu/items`, `PATCH /api/menu/items/{id}/toggle` |
| Tables | `GET/POST/PUT/DELETE /api/tables` |
| Orders | `GET /api/orders`, `GET/POST /api/orders/{id}`, `POST/DELETE /api/orders/{id}/items[/{itemId}]`, `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/items/{itemId}/seq` |

### Frontend — implemented routes
| Route | Status |
|---|---|
| `/register` | Restaurant + admin self-signup (split into 2 visual sections) |
| `/login` | Email + password → JWT |
| `/dashboard` | Avatar header + permission-filtered nav cards with icons |
| `/staff` | Staff list with status badges |
| `/staff/new`, `/staff/:id/edit` | Create + edit staff |
| `/menu` | Category cards (click to drill in) |
| `/menu/categories/:id` | Items in a category, add/edit/toggle/delete per item |
| `/orders` | Order list with status filter tabs |
| `/orders/new` | Two-step create flow (table → items) |
| `/orders/:id` | Detail with add/close/cancel + item-status cycling |
| `/settings` | Restaurant profile form (name, currency, address, phone) |
| `/schedule` | Placeholder |
| `/change-password` | Set new password (first login flow) |

### Auth & permissions
- **JWT 12h**, no refresh. Includes `permissions` claim (comma-separated `PermissionType` values).
- Login/Register response includes `permissions: string[]`, `restaurantName`, and `currency` — all stored in localStorage session.
- `usePermissions()` hook: `has(...perms)`, `hasAny(...perms)`.
- `RequireAuth` (frontend) checks localStorage session before render.
- `[RequirePermission(PermissionType.X)]` (backend, in `RestaurantCRM.API/Auth/`) checks the JWT claim and returns 403 if missing — so the API enforces permissions even if a bad client bypasses the frontend gate.
- Global 401 handler (frontend `api.ts`): if a request returns 401 *and* a token was sent, clear session and redirect to `/login`. Skips redirect on the login endpoint itself.

### Validation & error handling
- **FluentValidation** — every request DTO has an `AbstractValidator<T>` in the Application layer, auto-discovered via `AddValidatorsFromAssemblyContaining<T>`.
- Validation errors return `{"error": "first failure message"}` matching the rest of the API error envelope. The `InvalidModelStateResponseFactory` is configured *after* `AddControllers()` so it wins the options-pattern race.
- **Global exception handler** (`API/GlobalExceptionHandler.cs`, implements `IExceptionHandler`) maps:
  - `KeyNotFoundException` → 404
  - `InvalidOperationException` → 409
  - `UnauthorizedAccessException` → 401
  - `ArgumentException` → 400
  - anything else → 500 (logged with method + path)

  No controller has try/catch any more.

### Logging — Serilog
- `Program.cs` boots Serilog with a bootstrap logger first (catches startup failures), then swaps to the configured logger.
- Console sink + rolling file sink at `logs/log-{date}.txt` (kept 7 days, ignored in `.gitignore`).
- ASP.NET request noise filtered to Warning+; EF SQL filtered to Warning+.

### Not yet implemented
- Telegram `initData` HMAC verification on the backend
- SignalR real-time order events (OrderHub scaffolded, no emitters)
- Schedule management (permission seeded, UI is placeholder)
- Reservations, Warehouse, Cash Register, Reports, Clients

## Test accounts (local DB)

| Email | Password | Role |
|---|---|---|
| `aro@mail.ru` | `secret123` | Admin — full permissions |
| `lili@mail.ru` | `lili123` | Waiter — limited permissions |

## Auth model

- `POST /api/auth/register` — atomically creates Restaurant + 6 default Roles + Admin User. Returns JWT + permissions + `restaurantName` + `currency`.
- `POST /api/auth/login` — single query that joins User → Restaurant → Role → RolePermissions (no N+1).
- `POST /api/auth/change-password` — `[Authorize]`, verifies current password, sets status → `Active`.
- Telegram `initData` is sent on every request (`X-Telegram-Init-Data` header) but HMAC verification is **not yet implemented**.

## Multi-tenancy

- JWT carries `restaurantId` → `ITenantContext` → EF Core global query filter on every `ITenantEntity`. You can never accidentally read another restaurant's data through the DbContext.
- **For inserts** (creating new `ITenantEntity` rows), always use `tenant.RestaurantId` — never derive from another entity's `RestaurantId` and never read `db.Restaurants.FirstOrDefault()` (that table has no tenant filter and may return the wrong restaurant).

## Common pitfalls when extending the project

1. **New endpoint must have a `[RequirePermission(...)]`** unless it's auth-only (`/api/auth/*`) or returns only the caller's own data (`/api/restaurants/me`).
2. **New service that creates `ITenantEntity`** must inject `ITenantContext` and set `RestaurantId = tenant.RestaurantId` on every new entity.
3. **New money field** must be `decimal` with `HasPrecision(18, 2)` in EF config — never `double` or `float`.
4. **New DTO that goes over HTTP** needs an `AbstractValidator<T>` next to it. The validator's max-length rules must match the EF Core entity config.
5. **New migration** belongs in `RestaurantCRM.Infrastructure/Persistence/Migrations/` (NOT the old `Migrations/` folder — that was consolidated).
