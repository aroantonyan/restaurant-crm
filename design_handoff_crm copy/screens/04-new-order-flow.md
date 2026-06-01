# Screen — New order (3-step flow)

**Source pages**: `src/pages/orders/create/*`
**Prototype reference**: `ScreenNewOrder` in `prototype/screens.jsx`

This is the most complex flow. Hide the bottom tab bar throughout — focused mode.

## Step 1 — Select table

- AppHeader: back to /orders, "New order" + "Step 1 of 3 · Pick a table"
- 3-segment StepRail underneath
- 2-column grid of square tiles, one per table:
  - Top: "TABLE" tiny label + status pill
  - Big number (32px bold)
  - "N seats" meta
- Occupied tables disabled (opacity 0.5, no tap)

On tap → save `tableId` in OrderDraftContext, advance to step 2.

## Step 2 — Pick items (categories → category items)

Two sub-states:

### 2a — Category list

Same as Menu list (categories) but tapping a category just sets local state instead of navigating.

### 2b — Items inside a category

- Card per item: name + description + price
- Right side:
  - When qty 0: small round + button
  - When qty > 0: stepper pill with − / quantity / +

Cart bar (NEW) floats at bottom when cartCount > 0:
```
[count pill] Review order              {total}
```
Tapping → step 3.

## Step 3 — Review

- AppHeader: back to step 2 (returns to category list, not items)
- Lines per cart item: name + price × qty + line total
- Tertiary "Add more items" button below the list
- Floating confirm bar:
  - Hint: "Total · N items"
  - Big tabular total
  - Primary "Send to kitchen" → existing `api.orders.create({ tableId, items: [...] })` → on success navigate to /orders/:id

## Keep

- Your existing OrderDraftContext (zod schema'd cart state)
- All API calls
- Step header pattern but restyle
