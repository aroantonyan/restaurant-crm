# Screen — Reservations

**Source page**: `src/pages/reservations/ReservationsPage.tsx`
**Prototype reference**: `ScreenReservations` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Reservations" + day-relative subtitle
- Trailing: round + button → opens "New reservation" sheet
- Day scrubber: horizontal Chip row (Today · Tomorrow · {dates...})
- List of cards per reservation:
  - Left: 60px-min time block colored by status (accent-soft if Confirmed, muted otherwise). Big tabular time + small "N guests"
  - Middle: customer name, "Table N · phone" meta, optional italic note in accent-press
  - Right: StatusPill (Confirmed→ok, Pending→warn)

## Notes for implementation

- Implement day filtering server-side or client-side per your API capability
- Connect to existing `api.reservations` endpoints (add to OpenAPI if missing — outside this redesign scope)
