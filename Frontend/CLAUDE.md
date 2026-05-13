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
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run tunnel       # ngrok http 5173 — public HTTPS for BotFather
npm run gen:api      # regenerate src/lib/api-types.ts from backend OpenAPI doc
```

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
  main.tsx                  ← entry: initTelegram() → i18n init → router
  App.tsx                   ← routes + guards (RequireAuth / RedirectIfAuthed)
  index.css                 ← Tailwind + Telegram theme CSS vars
  lib/
    api.ts                  ← typed fetch wrapper + auth/initData header injection
    auth.ts                 ← localStorage session (token + AuthSession)
    telegram.ts             ← typed Telegram.WebApp wrapper, theme sync
  i18n/
    index.ts                ← i18next setup
    en.json / hy.json       ← translations (always keep in sync)
  components/
    Field.tsx               ← labeled input with error display (forwardRef)
    SubmitButton.tsx        ← button with loading state
    LanguageSwitcher.tsx    ← EN / ՀԱՅ toggle
  pages/
    Login.tsx               ← email + password → JWT stored in localStorage
    Register.tsx            ← restaurant owner self-signup (6 fields)
    Dashboard.tsx           ← greeting + Staff/Schedule tabs (tabs are placeholder only)
```

## Routes

| Path | Guard | Component | Status |
|---|---|---|---|
| `/` | — | Redirect → `/dashboard` | done |
| `/login` | RedirectIfAuthed | Login.tsx | done |
| `/register` | RedirectIfAuthed | Register.tsx | done |
| `/dashboard` | RequireAuth | Dashboard.tsx | shell done; tab content placeholder |
| `*` | — | Redirect → `/dashboard` | done |

## Validation rules (mirror backend DataAnnotations)

| Field | Rule | Backend source |
|---|---|---|
| firstName / lastName / fatherName | required, max 100 | UserConfiguration.cs |
| email | required, valid email, max 256, unique global | UserConfiguration.cs |
| password | required, min 6 | RegisterRequest.cs `[MinLength(6)]` |
| restaurantName | required, max 200 | RestaurantConfiguration.cs |

When backend changes a constraint, update Zod schemas in the relevant page.

## Telegram Mini App notes

- `initData` is available synchronously as soon as the page loads — no roundtrip needed
- It expires (`auth_date` field) — backend should reject if older than ~24h (not yet implemented)
- It's HMAC-signed with the bot token — backend will need to verify (not yet implemented)
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
