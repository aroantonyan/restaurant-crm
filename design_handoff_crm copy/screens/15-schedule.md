# Screen — Schedule

**Source page**: `src/pages/SchedulePage.tsx`
**Prototype reference**: `ScreenSchedule` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Schedule" + "This week"
- **7-day picker row** (one per weekday Mon–Sun):
  - Each tile: tiny day name + shift count (big tabular)
  - Active = accent fill / white text
  - Inactive = card bg with shadow
- List of shifts for selected day:
  - Card with left accent bar (8px wide), name, "from — to" time range (tabular), pencil edit button on right
- Empty day: EmptyState with "🌴 Day off"

## Sticky CTA

"Add shift to {dayName}" — primary.
