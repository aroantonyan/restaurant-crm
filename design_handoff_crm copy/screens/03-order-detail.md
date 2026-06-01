# Screen — Order detail

**Source page**: `src/pages/orders/OrderDetailPage.tsx`
**Prototype reference**: `ScreenOrderDetail` in `prototype/screens.jsx`

## Layout

- AppHeader: back chevron + "Table N" + meta (createdBy · time) + status pill on the right
- Client chip card (only when Open & has ViewClients permission): avatar + name OR "Assign client" placeholder
- Section title "Items · N"
- Item rows (cards). Each row:
  - Left: name + optional italic note in accent-press + price × qty meta
  - Right: tappable status pill (cycles state) + tabular-num line total
- **Dark "Total" bar** — uses `bg-bg-inverse` / `text-fg-inverse` tokens (correctly flips in both modes if you ever add dark)
- **Sticky bottom action bar** (when isOpen):
  - Hint line "Total · {fmt(grand)}"
  - Two side-by-side buttons: neutral "Add" + primary "Close & pay"
  - Below: small destructive text link "Cancel order"

## Important — sticky CTA

Use `<StickyActions hint={...}>`. Wrapping container needs `pb-[140px]` on the scroll area to clear the bar + cancel link. See `components-tsx/StickyActions.tsx` for layout pattern.

## Item status cycling

Tap status pill → optimistic cycle Pending → Preparing → Ready → Served. Use existing `api.orders.updateItemStatus()` call. Wrap the pill in a span with the `.tick` class re-keyed on each click for the small bounce animation.

## Sheets

- Payment method picker — replace existing inline modal with `<Sheet>`. 2×2 grid of method tiles (Cash, Card, BankTransfer, +Deposit if hasClient, Other).
- Client picker — replace with `<Sheet height="tall">`. Search input + scrollable result list.
