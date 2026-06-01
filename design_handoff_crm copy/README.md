# Restaurant CRM — Frontend Redesign Handoff

This bundle contains everything Claude Code needs to port the redesign into your real frontend (`Frontend/` — Vite + React 19 + TypeScript + Tailwind v4 + Telegram WebApp SDK).

## What's in this folder

```
design_handoff_crm/
├── README.md                  ← you are here. Read first.
├── CLAUDE_CODE_PROMPT.md      ← copy-paste this into Claude Code to start.
├── design-tokens.md           ← color, type, spacing, radius, motion tables.
├── components-tsx/            ← drop-in Tailwind v4 React components.
│   ├── AppHeader.tsx
│   ├── BottomTabBar.tsx
│   ├── StickyActions.tsx
│   ├── StatusPill.tsx
│   ├── Chip.tsx
│   ├── PrimaryButton.tsx
│   ├── Skeleton.tsx
│   ├── Sheet.tsx
│   └── useLoad.ts
├── screens/                   ← per-screen specs (markdown).
│   ├── 00-login.md
│   ├── 01-dashboard.md
│   ├── 02-orders-list.md
│   ├── 03-order-detail.md
│   ├── 04-new-order-flow.md
│   ├── 05-menu.md
│   ├── 06-menu-category.md
│   ├── 07-tables.md
│   ├── 08-reservations.md
│   ├── 09-reports.md
│   ├── 10-cash.md
│   ├── 11-warehouse.md
│   ├── 12-clients.md
│   ├── 13-activity-log.md
│   ├── 14-staff.md
│   ├── 15-schedule.md
│   └── 16-settings.md
└── prototype/                 ← original interactive HTML prototype.
    └── Restaurant CRM Redesign.html  ← open in a browser for live reference.
```

## About these files

The files in this bundle are **design references**, not production code to copy verbatim. The HTML prototype was built with inline JSX + plain inline styles for fast iteration; your real codebase is **Tailwind v4 + TypeScript + react-router 7**. The job is to **recreate the look, layout, and behavior of the prototype using your existing patterns** — same `useBackButton()`, `usePermissions()`, `api.*` layer, react-hook-form + Zod validation, react-i18next translations, etc.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, and motion timings are final. Component contracts, layouts, and interactions in the prototype are the source of truth. Tailwind classes in `components-tsx/` are the suggested implementation; spacing values are exact.

## Scope

**Light mode only** for this implementation pass. (The prototype includes a dark mode toggle for design exploration — ignore it.)

All 17 routes get touched:
- 4 in the bottom tab nav (Home/Dashboard, Orders, Menu, Tables)
- New Order multi-step flow (3 steps)
- Order Detail, Menu Category (item list)
- 10 secondary screens (Reservations, Reports, Cash, Warehouse, Clients, Activity, Staff, Schedule, Settings, Login)

## What stays the same in your codebase

Do not change:
- API layer (`src/lib/api.ts`) and typed DTOs
- Auth & permissions (`src/lib/auth.ts`, `usePermissions`, `RequireAuth`)
- Telegram integration (`src/lib/telegram.ts`) — except disable the `applyTheme()` call (see "Step 2" below)
- Form validation (Zod schemas)
- i18n keys (just retitle missing ones)
- Routing structure in `App.tsx`
- All `useBackButton()` and `useRealtimeEvent()` hooks
- Backend, contracts, OpenAPI generation

## What changes

1. **Palette + type tokens** (`src/index.css`) — replace `--color-tg-*` with new warm-neutral palette. Stop letting Telegram override them.
2. **New shared components** — add `AppHeader`, `BottomTabBar`, `StickyActions`, `StatusPill`, `Chip`, `Sheet`, `Skeleton`, `useLoad`. Update existing `SubmitButton`, `Field`, `Select` to use new tokens.
3. **Page rewrites** — every page in `src/pages/` gets restructured per its spec in `screens/`. Same data flow, new presentation.
4. **Bottom tab bar** added to `App.tsx` for the 4 primary routes.
5. **Inter font** added in `index.html`.

## Implementation order (recommended)

Do not try to do this all at once. Tackle in this order so you can ship in increments:

1. **Foundation** (1 day) — tokens, Inter font, shared components, BottomTabBar wiring in App.tsx. Don't touch any pages yet. Verify by visiting any existing page and confirming colors/fonts changed.
2. **Dashboard** (½ day) — fully port the new dashboard layout. This is the front door.
3. **Orders flow** (1 day) — Orders list → Order detail → New order 3-step flow. Most complex, most-used.
4. **Menu** (½ day) — Menu categories + Menu category items page.
5. **Tables** (¼ day)
6. **Secondary screens** (1–2 days) — Reservations, Reports, Cash, Warehouse, Clients, Activity, Staff, Schedule, Settings, Login. These are uniform applications of the same patterns; they go fast.

Total: ~4–5 focused days for a single developer.

## Step-by-step: foundation

### Step 1 — Add Inter font

In `Frontend/index.html`, add to `<head>` before the Tailwind import:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Step 2 — Replace tokens in `src/index.css`

See `design-tokens.md` for the full token table. Replace the contents of `src/index.css` with the version provided there.

**Important**: also edit `src/lib/telegram.ts` — comment out or remove the call to `applyTheme(tg)` inside `initTelegram()`. We're not letting Telegram's themeParams override our palette anymore (light mode only).

```ts
export function initTelegram(): void {
  const tg = getTelegram()
  if (!tg) return
  tg.ready()
  tg.expand()
  tg.disableVerticalSwipes?.()
  // applyTheme(tg)  // ← removed: we use our own palette now
}
```

### Step 3 — Add shared components

Create these files in `src/components/`:

- `AppHeader.tsx`
- `BottomTabBar.tsx`
- `StickyActions.tsx`
- `StatusPill.tsx`
- `Chip.tsx`
- `Sheet.tsx`
- `Skeleton.tsx`

Source for each is in `components-tsx/` in this bundle.

Also create `src/hooks/useLoad.ts` (source in `components-tsx/useLoad.ts`).

### Step 4 — Wire BottomTabBar into App.tsx

Wrap the Routes output in a layout component that conditionally renders BottomTabBar:

```tsx
// In App.tsx, wrap the routes with this layout:
import { useLocation } from 'react-router-dom'
import BottomTabBar from './components/BottomTabBar'

function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  // Hide tab bar on focused flows
  const hideOn = ['/login', '/register', '/change-password', '/orders/new']
  const showTabBar = !hideOn.some(p => pathname.startsWith(p))
                      && !pathname.match(/^\/orders\/[^/]+$/)         // order detail
                      && !pathname.match(/^\/menu\/categories\/[^/]+$/) // menu category
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">{children}</div>
      {showTabBar && <BottomTabBar />}
    </div>
  )
}
```

Then render `<AppShell><Routes>…</Routes></AppShell>` in your App.

### Step 5 — Update existing primitive components

- `SubmitButton.tsx` — change classes to match `PrimaryButton kind="primary"` in `components-tsx/PrimaryButton.tsx`
- `Field.tsx` — update label + input styles per `screens/16-settings.md` (FieldLabel pattern)
- `Select.tsx` — same as Field

After Step 5 your existing pages will look different (new palette, new buttons) — that's expected. Now you can rewrite them screen-by-screen.

## Per-screen rewrite recipe

For each page:

1. Open the matching spec in `screens/`
2. Open the matching component in the prototype (`prototype/screens.jsx` or `prototype/screens-extra.jsx`) — search for `ScreenDashboard`, `ScreenOrders`, etc.
3. Compare the prototype JSX with your current page in `src/pages/`
4. Keep your data fetching, mutations, hooks, validation, navigation untouched
5. Replace the JSX tree + className strings with the new layout from the prototype, translated to Tailwind classes using `design-tokens.md` mapping

The spec markdown gives you the **layout + measurements**; the prototype gives you the **exact JSX + behavior**.

## Translation notes

The prototype has hardcoded English strings ("Orders", "Add item to Starters", etc.). In your codebase, every string already routes through `t()`. Keep your `t()` calls — only change the JSX structure.

## Visual reference

Open `prototype/Restaurant CRM Redesign.html` in any browser. Click around. Use the Tweaks panel to switch density. Every interaction in there is the target behavior — match it.

## Open questions for the developer

Before you start, decide:
1. Do you want to keep `react-i18next` keys exactly as they are? (Yes: just retarget existing keys to new JSX placements. No: refactor i18n alongside.)
2. Do you want emoji icons (as in the prototype) or proper SVG icons? Prototype uses both — emoji on the dashboard tiles, SVG everywhere else. Decide before starting Step 3.
3. Bottom tab bar on tablets? (The prototype is mobile-only as per CLAUDE.md.)

Default: keep i18n keys, mixed emoji/SVG icons matching prototype, mobile-only — no further questions needed.
