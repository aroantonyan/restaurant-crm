# Screen — Menu (categories)

**Source page**: `src/pages/menu/MenuPage.tsx`
**Prototype reference**: `ScreenMenu` in `prototype/screens.jsx`

## Layout

- AppHeader: "Menu" + "{N} categories · {M} items"
- Trailing: round + button → opens "Add category" sheet (only when `ManageMenu`)
- List of cards:
  - 46×46 icon square (use existing `pickEmoji()` heuristic from current code)
  - Name (15.5px semibold)
  - "{count} items · {unavailableCount} unavailable" meta (unavailable count in warn color)
  - Right chevron

## Add category sheet

Replace existing inline modal with `<Sheet title="Add category">`. Single FieldLabel input + PrimaryButton submit.
