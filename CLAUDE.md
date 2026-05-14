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

# Terminal 2 — frontend
cd "Frontend" && npm run dev
# → http://localhost:5173 (Vite proxies /api/* → http://localhost:5293)

# Terminal 3 — Telegram tunnel (only when testing inside Telegram)
cd "Frontend" && npm run tunnel
# → public HTTPS URL to give to @BotFather
```

## API proxy (important)

When testing through Telegram (ngrok = HTTPS), the frontend **cannot** call the backend directly over plain HTTP — browsers block this as mixed content. The Vite dev server proxies all `/api/*` requests to `http://localhost:5293` on the server side, bypassing the restriction. `VITE_API_BASE_URL` is intentionally empty in `.env`; never set it to a localhost URL.

## Contract sync

When backend DTOs change:
1. Update the C# DTO + DataAnnotations
2. From `Frontend/`: `npm run gen:api` (writes `src/lib/api-types.ts` from `/openapi/v1.json`)
3. Update Zod schemas in the relevant page to mirror new validation thresholds

## What is implemented (as of now)

### Backend — fully working
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/change-password` |
| Restaurant | `GET /api/restaurants/me`, `PUT /api/restaurants/me` |
| Staff | `GET /api/staff`, `GET /api/staff/roles`, `GET /api/staff/{id}`, `POST /api/staff`, `PUT /api/staff/{id}`, `DELETE /api/staff/{id}` |

### Frontend — implemented
| Route | Status |
|---|---|
| `/register` | Restaurant owner self-signup |
| `/login` | Email + password → JWT |
| `/dashboard` | Permission-based tabs (Staff tab for `ViewStaff`, Schedule placeholder for `ViewSchedules`) |
| `/staff/new` | Create staff member with temp password |
| `/staff/:id/edit` | Edit staff + deactivate |

### Auth & permissions
- JWT is **12h**, includes `permissions` claim (comma-separated string of `PermissionType` values)
- Login/Register response includes `permissions: string[]` — stored in localStorage session
- `usePermissions()` hook: `has(...perms)`, `hasAny(...perms)`
- `RequireAuth` checks the full session (not just the token) — stale sessions redirect to `/login`
- Dashboard tabs rendered dynamically from `TAB_CONFIG` filtered by permission

### Not yet implemented
- **First-login password change UI** — staff with `PendingPasswordChange` status have no way to set their own password; `POST /api/auth/change-password` exists on the backend but there is no frontend page or redirect for it
- Restaurant settings page (`PUT /api/restaurants/me` exists but no frontend)
- Menu, orders, tables, reservations, reports (no backend or frontend)
- Schedule management (backend permission exists; tab is placeholder only)
- Telegram `initData` HMAC verification on the backend
- SignalR real-time events (OrderHub is scaffolded but unused)

## Test accounts (local DB)

| Email | Password | Role |
|---|---|---|
| `aro@mail.ru` | `secret123` | Admin — full permissions |
| `lili@mail.ru` | `lili123` | Waiter — limited permissions |

## Auth model

- `POST /api/auth/register` — creates Restaurant + Admin user + **6 default roles** atomically
- `POST /api/auth/login` — email + password → JWT (12h, no refresh) + permissions array
- `POST /api/auth/change-password` — [Authorize]; verifies current password, sets status → Active; **no frontend yet**
- Telegram `initData` is sent on every request (`X-Telegram-Init-Data` header) but HMAC verification is **not yet implemented**

## Multi-tenancy

JWT carries `restaurantId` claim → `ITenantContext` → EF Core global query filter on every `ITenantEntity`. You can never accidentally read another restaurant's data through the DbContext.
