# Screen — Warehouse

**Source page**: `src/pages/warehouse/WarehousePage.tsx`
**Prototype reference**: `ScreenWarehouse` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Warehouse" + "{N} products · {M} low stock"
- Search bar (white card with leading search icon + transparent input)
- Low-stock warn banner (only if any): warn-soft bg, "⚠️ {N} items below threshold — reorder soon"
- List of product cards:
  - Top row: name + category meta | right: big stock value with unit + "min {threshold}" meta
  - Bottom row: progress bar (height 4) — fill % = clamp(stock/(threshold*2), 0, 1). Color: ok if above threshold, warn if below.

## Sticky CTA

"Receive stock" — kind="primary".

## Detail page

Existing `WarehouseProductDetail.tsx` — apply same patterns. Out of immediate scope for the prototype but follow Settings/Reports vibe.
