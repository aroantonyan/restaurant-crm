# CLAUDE.md — Frontend

Telegram Mini App frontend for Restaurant CRM. Mobile-first, runs inside Telegram WebView.

## Stack

- **Vite 8 + React 19 + TypeScript** — modern default; Vite uses native ESM in dev (instant HMR)
- **Tailwind CSS v4** — utility classes; theme via CSS vars wired to Telegram theme params
- **react-router-dom 7** — routing
- **react-hook-form + Zod** — uncontrolled forms + a single schema for runtime validation and TS inference
- **react-i18next + i18next-browser-languagedetector** — English (`en`) + Armenian (`hy`); detection order: localStorage → Telegram language_code → navigator
- **Telegram WebApp SDK** — `window.Telegram.WebApp` injected by `<script src="https://telegram.org/js/telegram-web-app.js?57">` in `index.html`

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173 (HMR, but slow inside Telegram)
npm run build        # tsc -b && vite build
npm run start        # build + preview at http://localhost:5173 (fast — use this for Telegram testing)
npm run preview      # serve dist/ (run after npm run build)
npm run lint         # ESLint
npm run tunnel       # ngrok http 5173 — public HTTPS for BotFather
npm run gen:api      # regenerate src/lib/api-types.ts from backend OpenAPI doc
```

**Use `npm run dev` for code editing**, `npm run start` for Telegram testing. Dev mode serves hundreds of unbundled modules over HTTP; preview serves one bundled file.

## Containerization

Production image is a multi-stage build (`Dockerfile`): `node:22-alpine` runs
`vite build` → static `dist/` is served by `nginx:1.27-alpine`. `nginx.conf`
provides the SPA fallback, immutable caching for hashed assets, security headers,
and **proxies `/api/*` and `/hubs/*` to the `api` container** — so in production
the browser calls the same origin (no CORS, no mixed-content), exactly mirroring
the Vite dev proxy. nginx listens on `:8080` and runs as the non-root `nginx`
user. `VITE_API_BASE_URL` stays empty (baked into the bundle as same-origin).
Full deploy flow: root `DEPLOYMENT.md`.

## Backend integration

Sibling project: `../Backend/src/` (ASP.NET Core 9, port 5293). Contract source of truth.

**API calls use a Vite proxy.** `VITE_API_BASE_URL` is intentionally empty in `.env`. All `/api/*` requests from the browser go to the same origin (localhost:5173 or ngrok), and Vite forwards them to `http://localhost:5293` on the server side. This avoids mixed-content blocking when the frontend is served over HTTPS (ngrok) while the backend is HTTP.

**Never set `VITE_API_BASE_URL` to a localhost URL** — that breaks Telegram testing through ngrok (HTTPS page cannot call HTTP backend directly).

**Every authenticated request sends two headers** (handled in `src/lib/api.ts`):
- `Authorization: Bearer <jwt>` — restored from `localStorage.auth_token`
- `X-Telegram-Init-Data: <window.Telegram.WebApp.initData>` — synchronous, no async cost (Telegram injects it before script execution); omitted when empty (local dev outside Telegram)

**Error envelope:** backend returns `{ "error": "message" }`, parsed by `extractError()` in `api.ts`. The `ApiError` class carries `status` + `message`. Any exception that is NOT an `ApiError` (e.g., network failure) shows a generic i18n fallback — if you see the generic message, check browser DevTools Network tab for the real failure.

## Layout

```
src/
  main.tsx                       ← entry: initTelegram() → i18n init → router
  App.tsx                        ← routes + guards (RequireAuth / RedirectIfAuthed)
  index.css                      ← Tailwind + Telegram theme CSS vars
  lib/
    api.ts                       ← typed fetch wrapper + auth/initData header injection + global 401 handler
    auth.ts                      ← localStorage session (token + AuthSession with currency + restaurantName)
    format.ts                    ← formatPrice(amount, currency?) — drops decimals for AMD/JPY/KRW etc.
    telegram.ts                  ← typed Telegram.WebApp wrapper, theme sync
  i18n/
    index.ts, en.json, hy.json   ← i18next setup + translations (keep in sync)
  components/
    Field.tsx, Select.tsx,
    SubmitButton.tsx,
    LanguageSwitcher.tsx,
    RequireAuth.tsx
  hooks/
    usePermissions.ts            ← has(...) / hasAny(...) against session permissions
    useBackButton.ts             ← wire Telegram BackButton → react-router navigate(-1)
  pages/
    Login.tsx, Register.tsx,
    Dashboard.tsx,               ← avatar header, icon nav cards, gear dropdown
    ChangePassword.tsx,
    SettingsPage.tsx,            ← restaurant profile form
    SchedulePage.tsx,            ← placeholder
    staff/                       ← StaffTab, StaffCreate, StaffEdit
    menu/                        ← MenuPage (category cards), MenuCategoryPage (items in category)
    orders/                      ← OrdersPage, CreateOrderPage, OrderDetailPage
```

## Routes

| Path | Guard | Component |
|---|---|---|
| `/` | — | Redirect → `/dashboard` |
| `/login` | RedirectIfAuthed | Login |
| `/register` | RedirectIfAuthed | Register |
| `/dashboard` | RequireAuth | Dashboard |
| `/change-password` | RequireAuth | ChangePassword |
| `/staff`, `/staff/new`, `/staff/:id/edit` | RequireAuth | StaffTab, StaffCreate, StaffEdit |
| `/menu` | RequireAuth | MenuPage (category cards) |
| `/menu/categories/:id` | RequireAuth | MenuCategoryPage (items in category) |
| `/orders`, `/orders/:id` | RequireAuth | OrdersPage, OrderDetailPage |
| `/orders/new/*` | RequireAuth | Multi-step create flow (`pages/orders/create/`): SelectTable → Categories → CategoryItems → Review, with a shared `OrderDraftContext` + `CartBar` |
| `/orders/:id/add-items/*` | RequireAuth | Same create flow, reused to append items to an existing open order |
| `/tables` | RequireAuth | TablesPage |
| `/reservations` | RequireAuth | ReservationsPage |
| `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` | RequireAuth | ClientsPage, ClientForm, ClientDetailPage |
| `/warehouse`, `/warehouse/new`, `/warehouse/:id`, `/warehouse/:id/edit` | RequireAuth | WarehousePage, WarehouseCreate, WarehouseProductDetail, WarehouseEdit |
| `/menu/items/:id/recipe` | RequireAuth | MenuItemRecipePage |
| `/cash-register` | RequireAuth | CashRegisterPage |
| `/reports` | RequireAuth | ReportsPage |
| `/activity-log` | RequireAuth | ActivityLogPage |
| `/settings` | RequireAuth | SettingsPage |
| `/schedule` | RequireAuth | SchedulePage |
| `*` | — | Redirect → `/dashboard` |

> `src/App.tsx` is the authoritative route list — the exact paths/guards live
> there. Each route is gated client-side by `usePermissions()` and again
> server-side by `[RequirePermission]` on the matching controller.

## Validation rules (mirror backend FluentValidation)

| Field | Rule | Backend source |
|---|---|---|
| firstName / lastName / fatherName | required, max 100 | RegisterRequestValidator, CreateStaffRequestValidator |
| email | required, valid email, max 256, unique global | RegisterRequestValidator |
| password | required, min 6 | RegisterRequestValidator |
| restaurantName | required, max 200 | RegisterRequestValidator |
| menu item name | required, max 200 | CreateMenuItemRequestValidator |
| menu item price | > 0 | CreateMenuItemRequestValidator |
| order item quantity | 1..99 | AddOrderItemRequestValidator |

When backend changes a constraint, update Zod schemas in the relevant page.

## Currency

`AuthResponse` includes the restaurant's `currency` (default `AMD`). It's stored in `AuthSession.currency` and read by `formatPrice(amount)` in `lib/format.ts`. Currencies that conventionally don't show decimals (AMD, JPY, KRW, HUF, CLP) drop trailing `.00`. The user's restaurant currency is the source of truth — when displaying any money amount on the frontend, use `formatPrice()`, never `.toFixed(2)`.

## Telegram Mini App notes

- `initData` is available synchronously as soon as the page loads — no roundtrip needed
- It expires (`auth_date` field) — the backend rejects payloads older than `Telegram:MaxAgeMinutes` (default 24h) when enforcement is on
- It's HMAC-signed with the bot token — the backend verifies it (`TelegramInitDataValidator`), enforced on protected `/api/*` when `Telegram:Enforce=true` (off in dev)
- For local dev outside Telegram, `initData` is empty and the header is omitted; backend accepts JWT-only requests during development

## Theming

`initTelegram()` reads `Telegram.WebApp.themeParams` and writes each value as a CSS variable (`--tg-theme-*`) on `document.documentElement`. Tailwind classes like `bg-tg-button`, `text-tg-hint`, `text-tg-destructive` etc. consume these vars. `data-theme` on `<body>` switches light/dark.

## Mobile-first rules (mandatory — never break these)

This app runs exclusively in Telegram's mobile WebView. Every UI decision must account for touch interaction, on-screen keyboard, and small screens.

### Keyboard / focus
- **`--tg-stable-height`** is set once in `initTelegram()` from `viewportStableHeight` and applied as `height` on `html/body`. This variable NEVER changes when the keyboard opens — so the layout freezes and no reflow occurs. The keyboard just overlays on top; `#root` (the only scroll container) scrolls to bring the focused input into view automatically.
- **Never use `height: 100vh` or `height: 100%` inside pages** — those values change with the keyboard. Use `min-h-full` inside `#root` which is already the stable scroll container.
- **Input `font-size` must be ≥ 16px** (`text-base` or `max(16px, 1rem)` in global CSS). iOS Safari auto-zooms inputs smaller than 16px, which violently resizes the viewport and causes focus to jump to adjacent fields. This is enforced globally in `index.css`.
- **Never put two inputs side-by-side in a grid on form pages.** Two touch targets next to each other cause accidental focus on the wrong field when the keyboard shifts the view. Use single-column layout for all form inputs.
- **`scroll-mb-30` on inputs** gives 120px clearance so the browser scrolls to leave space for the keyboard when bringing the focused field into view.
- **`enterKeyHint`** should be set on every input: `"next"` for all intermediate fields, `"done"` for the last one. This shows the right action label on the mobile keyboard.

### Touch interaction
- `touch-action: manipulation` is set globally on `body`, `input`, `button`, `select`. This removes the 300ms tap delay.
- `-webkit-tap-highlight-color: transparent` prevents the gray flash on tap.
- All tap targets (buttons, list items) must be ≥ 44px tall (`py-3` minimum = 48px total with padding).
- Active states on buttons use `active:scale-[0.98]` for tactile feedback.

### Page transitions
- Every page `<main>` must include `page-enter` class. This applies a 220ms fade + slide-up animation on mount, making navigation feel native.
- The animation is defined in `index.css` as `@keyframes page-enter`.

### Scroll container architecture
```
html/body  ← fixed height (--tg-stable-height), overflow: hidden
  #root    ← height: 100%, overflow-y: auto, -webkit-overflow-scrolling: touch
    <main> ← min-h-full, flex flex-col, px-5 pt-6 pb-10
```
`pb-10` (40px) gives bottom breathing room above the Telegram home indicator on iPhone.
