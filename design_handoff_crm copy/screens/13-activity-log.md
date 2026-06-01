# Screen — Activity log

**Source page**: `src/pages/ActivityLogPage.tsx`
**Prototype reference**: `ScreenActivity` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Activity log" + "Audit trail · last 7 days"
- **Vertical timeline** (not separate cards):
  - Each entry: 30×30 circular icon (white card with subtle shadow) + connecting vertical line to next
  - Right: bold actor name (color per kind) + " " + action text (fg-2)
  - Below: elapsed time meta in fg-3

## Kind → color map

- order → info
- menu → accent-press
- cash → ok
- staff → info
- tables → warn
- settings → fg-2

## Icon map

Emoji is fine: 📝🍽️💵👥🪑⚙️ — match prototype.

## No sticky CTA — read-only screen.
