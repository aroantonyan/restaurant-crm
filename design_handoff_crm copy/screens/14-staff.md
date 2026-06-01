# Screen — Staff

**Source page**: `src/pages/staff/StaffTab.tsx`
**Prototype reference**: `ScreenStaff` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Staff" + "{N} active members"
- List of member cards (button per row, navigate to edit on tap):
  - 40×40 round avatar with initials (muted bg)
  - Name + email meta
  - Right column: role label (small bold, color per role) + StatusPill (Active→ok, Pending→warn, Inactive→muted)
- Inactive rows: 55% opacity

## Sticky CTA

"Invite member" → existing `/staff/new` create flow.

## Edit page

Existing `StaffEdit.tsx` — wrap form in Sheet pattern or full page, your choice. Use FieldLabel + PrimaryButton + dangerSoft delete with confirm.
