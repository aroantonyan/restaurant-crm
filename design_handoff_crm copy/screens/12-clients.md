# Screen — Clients

**Source page**: `src/pages/clients/ClientsPage.tsx`
**Prototype reference**: `ScreenClients` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Clients" + "{N} saved"
- Search bar (same pattern as Warehouse)
- List of client cards:
  - 38×38 round avatar with initials (accent-soft bg, accent-press text)
  - Name + "phone · N visits" meta
  - Right: deposit balance, color = danger if negative, ok if positive, hidden if zero

## Sticky CTA

"Add client".

## Detail / form

Existing `ClientDetailPage.tsx` + `ClientForm.tsx` — re-apply Settings pattern.
