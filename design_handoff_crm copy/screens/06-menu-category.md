# Screen — Menu category (items)

**Source page**: `src/pages/menu/MenuCategoryPage.tsx`
**Prototype reference**: `ScreenMenuCategory` in `prototype/screens.jsx`

## Layout

- AppHeader: back to /menu, category name, item count subtitle
- Trailing: pencil icon button → opens edit-category sheet
- List of item cards:
  - Name + optional "UNAVAILABLE" warn label inline
  - Description (clamp-2)
  - Price (bold tabular)
  - Right column: 2 stacked square icon buttons (34×34): pencil (edit) + check/eye-off (toggle availability)
- Unavailable items: card opacity 0.55

## Sticky bottom CTA — IMPORTANT

The "Add item to {category}" button must be STICKY at the bottom, **not at the bottom of the scrolling list**. Users were complaining about scrolling to reach it.

```tsx
<StickyActions>
  <PrimaryButton kind="primary" icon={<PlusIcon />} onClick={() => openItemSheet('new')}>
    Add item to {category.name}
  </PrimaryButton>
</StickyActions>
```

Page scroll container needs `pb-24` (96px).

## Sheets

- Item create/edit — replace existing modal with `<Sheet>`. Form: name, description, price, availability checkbox. PrimaryButton submit. Optional secondary "Open recipe editor" link if `ViewWarehouse` perm. Tertiary destructive "Delete item" with confirm step.
- Category edit/delete — same Sheet pattern.

## Item toggle

Optimistic: flip local state immediately, fire `api.menu.toggleItem()`, revert on error. Animate opacity transition on the card via `transition: opacity .2s`.
