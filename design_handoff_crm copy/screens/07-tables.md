# Screen — Tables

**Source page**: `src/pages/TablesPage.tsx`
**Prototype reference**: `ScreenTables` in `prototype/screens.jsx`

## Layout

- AppHeader: "Tables" + "{N} free · {M} occupied" subtitle
- Trailing: round + button (only if `ManageTables`)
- Filter chip row: All · Free · Occupied · Reserved, each with count badge
- 2-column grid of square tiles per table:
  - Top: "TABLE" tiny uppercase label + status pill (sm size)
  - Big number (32px bold, ~32px line-height)
  - "{capacity} seats" meta below
- Tap → open edit sheet (if `ManageTables`)

## Edit/create sheet

Replace inline modal with `<Sheet>`. Number + capacity fields. PrimaryButton submit. Tertiary destructive "Delete" with confirm step.

## Empty state

If no tables: EmptyState pattern.

## Real-time

Keep `useRealtimeEvent('tableChanged')` reload.
