# Screen — Orders list

**Source page**: `src/pages/orders/OrdersPage.tsx`
**Prototype reference**: `ScreenOrders` in `prototype/screens.jsx`

## Layout

- AppHeader with title "Orders", subtitle showing open count
- Trailing: round 36px terracotta `+` button → navigates to `/orders/new` (gated on `CreateOrder` permission)
- Filter chips row (Open / Paid / Cancelled / All) with per-status counts as badges
- List of cards, each 2-row:
  - Row 1: 38×38 table number badge + table label / client first name + meta (item count · createdBy · elapsed) + status pill
  - Row 2: items preview (comma-joined names, clamp-1) + total in tabular-nums

## Behavior

- Real-time refresh via existing `useRealtimeEvent('orderChanged')`
- Skeleton rows during initial `loading` state
- Status mapping for pill kind: Open→info, Paid→ok, Cancelled→muted
- If an Open order has all items in Ready/Served, override pill label to "Ready" with ok kind

## Empty state

If no orders for the current filter: use the EmptyState pattern from prototype (icon, title, hint).
