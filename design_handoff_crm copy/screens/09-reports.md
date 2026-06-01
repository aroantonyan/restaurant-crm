# Screen — Reports

**Source page**: `src/pages/ReportsPage.tsx`
**Prototype reference**: `ScreenReports` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Reports" + "Sales & operations"
- Range Chip row: Today · Week · Month
- Headline revenue card (large): "REVENUE" label / big tabular total / change pill (e.g. "+12%" in ok or "-2%" in danger) / sparkline bars
- 2-column small KPI cards: Orders count + Avg ticket
- "Top items" card with numbered rank rows: rank / name (clamp-1) / qty sold / revenue total

## Sparkline

Use simple flex-based bars (height ratio of value / max). Last bar in accent color, rest muted. `transition: height .35s` for smooth update.

## Wire to API

Replace mocked totals with real backend reports endpoint when available.
