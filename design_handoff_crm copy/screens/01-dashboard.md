# Screen — Dashboard

**Source page**: `src/pages/Dashboard.tsx`
**Prototype reference**: `ScreenDashboard` in `prototype/screens.jsx`

## Big change: fits one screen, no scroll

- **Today** group (4 rich cards with descriptions): Orders, Menu, Tables, Reservations
- **More** group (8 compact tiles in a 4-column grid): Cash, Reports, Stock, Clients, Staff, Schedule, Settings, Activity

Tiles are square-ish, just icon + label below — no description. That's how all 12 fit.

## Header

- 46×46 terracotta avatar with first initial
- "Good evening, {name}" greeting (`dashboard.greeting`)
- Role · Restaurant name on second line
- Right: gear icon button (round) → opens the existing logout/language dropdown OR navigates to `/settings`

## Snapshot card (NEW)

White card immediately below header with 3 stats divided by vertical lines:
- "Open orders" / count / blue text
- "Today rev." / formatted amount / green text
- "Tables free" / "4/10" / grey text

Wire these to real data. Snapshot is the only piece showing live numbers without drilling into a page.

## Nav permission filtering

Keep your existing `usePermissions().has()` filter. Apply to both Today and More.

## Tile style (More group)

```tsx
<button onClick={() => navigate(it.path)} className="tappable bg-card shadow-card rounded-2xl p-3 flex flex-col items-center gap-1.5">
  <span className="text-[22px]">{emoji}</span>
  <span className="text-[11.5px] font-semibold text-fg-2" style={{ letterSpacing: '-0.005em' }}>{label}</span>
</button>
```
