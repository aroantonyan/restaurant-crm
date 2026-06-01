# Screen — Cash register

**Source page**: `src/pages/CashRegisterPage.tsx`
**Prototype reference**: `ScreenCash` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Cash register" + shift duration subtitle
- **Drawer balance card** (dark): uses `bg-bg-inverse` / `text-fg-inverse` tokens. "DRAWER BALANCE" label + big tabular total + OPEN status indicator (pulsing dot)
- 2-column quick actions: "Cash in" (ok-soft icon bg) and "Cash out" (danger-soft icon bg) — both open sheets to enter amount + note
- "Recent movements" section: list of cards with circular ok/danger icon + ref + method/elapsed meta + amount (+ or - prefixed, colored)

## Sticky CTA

"Close shift" — `kind="dangerSoft"`.

## API hooks

Connect to existing `api.cash` endpoints. Keep your shift open/close transaction logic.
