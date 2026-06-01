# Design tokens

## How to apply

Replace the contents of `Frontend/src/index.css` with the block below. Tailwind v4 picks up `@theme` automatically — no config change needed.

```css
@import "tailwindcss";

@theme {
  /* ─── Palette — warm neutrals + terracotta accent ────────────── */
  --color-bg:         #F4F2EE;  /* app background (warm off-white) */
  --color-card:       #FFFFFF;  /* cards, sheets */
  --color-muted:      #ECEAE4;  /* secondary surfaces, dividers, dots */

  --color-fg:         #0E0E10;  /* primary text */
  --color-fg-2:       #4D4C49;  /* secondary text */
  --color-fg-3:       #8A8884;  /* hint / placeholder */
  --color-fg-4:       #B4B1AB;  /* disabled, chevrons */

  /* Inverse surface — used for the dark "Total" bar on Order Detail
     and the dark "Drawer balance" card on Cash. Always opposite of card. */
  --color-bg-inverse: #0E0E10;
  --color-fg-inverse: #FFFFFF;

  /* Accent — terracotta */
  --color-accent:       #D9633F;
  --color-accent-press: #BE4F2E;
  --color-accent-soft:  #FBEDE3;

  /* Semantic — text + soft background pairs for status pills */
  --color-ok:         #1F8A4E;
  --color-ok-soft:    #E5F2EA;
  --color-warn:       #B5740B;
  --color-warn-soft:  #FBEEDB;
  --color-info:       #1A66CC;
  --color-info-soft:  #E5EEFB;
  --color-danger:     #C73A2E;
  --color-danger-soft:#FBE6E2;

  /* Lines */
  --color-line:        rgba(15, 15, 16, 0.06);
  --color-line-strong: rgba(15, 15, 16, 0.12);

  /* Bar — translucent for glass effect on sticky bars */
  --color-bar-bg: rgba(244, 242, 238, 0.86);

  /* Fonts */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}

/* ─── Base ───────────────────────────────────────────────────── */
html, body, #root { height: 100%; width: 100%; }

body {
  margin: 0;
  font-family: var(--font-sans);
  font-feature-settings: 'cv11', 'ss01', 'ss03', 'cv02';
  -webkit-font-smoothing: antialiased;
  background: var(--color-bg);
  color: var(--color-fg);
  letter-spacing: -0.005em;
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

#root {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

input, button, select, textarea {
  font-family: inherit;
  touch-action: manipulation;
}
/* Anti-zoom: keep ≥16px on inputs */
input, select, textarea { font-size: max(16px, 1rem); }

/* ─── Motion ─────────────────────────────────────────────────── */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: page-enter 260ms cubic-bezier(0.16,1,0.3,1) both; }

@keyframes item-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.item-enter { animation: item-enter 360ms cubic-bezier(0.16,1,0.3,1) both; }

@keyframes sheet-in {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.sheet-in { animation: sheet-in 320ms cubic-bezier(0.16,1,0.3,1) both; }

@keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
.backdrop-in { animation: backdrop-in 220ms cubic-bezier(0.16,1,0.3,1) both; }

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    rgba(15,15,16,0.04) 0%,
    rgba(15,15,16,0.08) 50%,
    rgba(15,15,16,0.04) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
  border-radius: 12px;
}

@keyframes tick-up {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.tick { display: inline-block; animation: tick-up 220ms cubic-bezier(0.16,1,0.3,1) both; }

@keyframes pop {
  0%   { transform: scale(0.7); }
  60%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.pop { animation: pop 240ms cubic-bezier(0.16,1,0.3,1) both; }

/* Tap feedback (replaces all the active:scale-[0.98] inline usage) */
.tappable { transition: transform .14s cubic-bezier(0.32,0.72,0.2,1); }
.tappable:active { transform: scale(0.985); }

/* Line clamps */
.clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
```

## Token reference

### Colors

| Token (Tailwind class) | Hex | Used for |
|---|---|---|
| `bg-bg` | `#F4F2EE` | App background |
| `bg-card` | `#FFFFFF` | Cards, sheets, list rows |
| `bg-muted` | `#ECEAE4` | Secondary surfaces |
| `bg-bg-inverse` | `#0E0E10` | Order total bar, Cash drawer |
| `text-fg` | `#0E0E10` | Primary text |
| `text-fg-2` | `#4D4C49` | Secondary text |
| `text-fg-3` | `#8A8884` | Hint, placeholder, meta |
| `text-fg-4` | `#B4B1AB` | Chevrons, disabled |
| `text-fg-inverse` | `#FFFFFF` | Text on inverse |
| `bg-accent` | `#D9633F` | Primary buttons, active tab, FAB |
| `bg-accent-press` | `#BE4F2E` | Pressed/active accent |
| `bg-accent-soft` | `#FBEDE3` | Soft accent surfaces, reservation chips |
| `text-ok`, `bg-ok-soft` | `#1F8A4E`, `#E5F2EA` | Success / Free / Paid / Ready |
| `text-warn`, `bg-warn-soft` | `#B5740B`, `#FBEEDB` | Occupied / Pending / Unavailable |
| `text-info`, `bg-info-soft` | `#1A66CC`, `#E5EEFB` | Open / Reserved / Preparing |
| `text-danger`, `bg-danger-soft` | `#C73A2E`, `#FBE6E2` | Destructive, cancel |

### Typography

Font: **Inter** with letter-spacing `-0.005em` baseline.

| Use | Tailwind | Size / weight / tracking |
|---|---|---|
| Page title (H1) | `text-2xl font-bold` + `tracking-[-0.02em]` | 28px / 700 |
| Section title | `text-xs font-bold uppercase tracking-[0.06em] text-fg-3` | 11.5px / 700 / 0.06em |
| Card title | `text-[15px] font-semibold` + `tracking-[-0.005em]` | 15px / 600 |
| Card meta | `text-xs text-fg-3` | 12px / 500 |
| Total / KPI | `text-[28px] font-bold tracking-[-0.025em] tabular-nums` | 28px / 700 |
| Price | `font-bold tabular-nums` | varies |
| Button | `text-[15.5px] font-semibold` | 15.5px / 600 |
| Status pill | `text-xs font-semibold` | 12px / 600 |
| Chip | `text-[13.5px] font-semibold` | 13.5px / 600 |

**Numerals**: always use `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) for prices and counts.

### Spacing

| Use | Value |
|---|---|
| Page horizontal padding | `px-5` (20px) |
| Card padding | `p-3.5` (14px) for compact rows, `p-4` (16px) for cards |
| List gap | `gap-2` (8px) — adjustable per density |
| Section gap | `gap-[22px]` (22px between major sections) |
| Top of page (status bar safe) | `pt-[52px]` (account for Telegram WebApp header) |
| Bottom for sticky CTA | `pb-24` (96px) on scroll container |
| Bottom for sticky CTA + secondary action | `pb-[140px]` |

### Radii

| Use | Tailwind | Value |
|---|---|---|
| Pill / chip | `rounded-full` | 9999px |
| Icon button | `rounded-full` (round) or `rounded-xl` (square) | 999 / 12 |
| List card | `rounded-2xl` | 16px |
| Big card | `rounded-[18px]` or `rounded-[20px]` | 18–20px |
| Sheet | `rounded-t-[28px]` | 28px top |

### Shadows

```css
--shadow-card:  0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05);
--shadow-elev:  0 10px 24px -8px rgba(15,15,16,.14), 0 1px 3px rgba(15,15,16,.06);
--shadow-sheet: 0 -10px 36px -8px rgba(15,15,16,.18);
```

Apply as inline `style={{ boxShadow: 'var(--shadow-card)' }}` or wrap in a utility class.

### Motion

| Use | Duration | Easing |
|---|---|---|
| Page enter | 260ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| List item stagger | 360ms with 30ms delay × index | same |
| Sheet slide-up | 320ms | same |
| Tap feedback | 140ms | `cubic-bezier(0.32, 0.72, 0.2, 1)` |
| Toggle / status flip | 220ms | same |

Stagger animations: `style={{ animationDelay: `${idx * 30}ms` }}` on each list item with class `item-enter`.

### Touch targets

Every interactive element ≥ 44px tall. Sticky CTAs are ≥ 48px. Filter chips are 36px tall × ≥ 56px wide.

### Density

The prototype exposed `density-compact` / `density-balanced` / `density-roomy` via CSS vars. **For shipping, just use balanced** — the user can choose later in settings if you want, but don't make it a Tweak in production.

| Density | Row padding-y | List gap |
|---|---|---|
| balanced (default) | 14px | 8px |
