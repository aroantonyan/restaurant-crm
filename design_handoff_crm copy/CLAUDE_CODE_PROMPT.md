# Claude Code — kickoff prompt

Copy the block below and paste it into Claude Code in your repo root (the directory that contains both `Frontend/` and `Backend/`). Make sure the `design_handoff_crm/` folder is also present at the repo root so Claude Code can read it.

---

```
I need you to implement a frontend redesign. The full spec is in `design_handoff_crm/`. 
The codebase is in `Frontend/` (Vite + React 19 + TypeScript + Tailwind v4 + 
Telegram WebApp SDK + react-router 7 + react-hook-form + zod + react-i18next).

## Required reading before you write any code

Read these in order:
1. `design_handoff_crm/README.md` — overall plan, what stays, what changes, implementation order.
2. `design_handoff_crm/design-tokens.md` — the new palette, type scale, motion, and the replacement `src/index.css`.
3. `Frontend/CLAUDE.md` — existing project conventions, MUST be respected (especially the "Mobile-first rules" section).
4. `Frontend/src/App.tsx` — current routing structure.
5. `design_handoff_crm/components-tsx/*.tsx` — ready-to-port new shared components.
6. `design_handoff_crm/screens/01-dashboard.md` and walk through one prototype screen to confirm your understanding.
7. Open `design_handoff_crm/prototype/Restaurant CRM Redesign.html` in a browser as visual reference 
   while you work — the .jsx files in that folder define the exact behavior.

## What to preserve (do NOT touch)

- `src/lib/api.ts` and all DTO types
- `src/lib/auth.ts`, `RequireAuth`, `usePermissions`
- `src/hooks/useBackButton.ts`, `useRealtimeEvent.ts`
- All Zod schemas (validation rules)
- All i18n keys in `src/i18n/*.json` — re-use existing keys, only add new ones if a string is genuinely new
- Backend, OpenAPI generation, contract sync

## What to do

Follow the "Implementation order" in `design_handoff_crm/README.md`. Do NOT do everything at once.

### Phase 1 — Foundation (do this fully and stop, ask me to verify)

1. Add Inter font in `Frontend/index.html` (instructions in README Step 1)
2. Replace contents of `Frontend/src/index.css` with the block from `design-tokens.md`
3. In `Frontend/src/lib/telegram.ts`, comment out the `applyTheme(tg)` call inside `initTelegram()`
4. Create new files in `Frontend/src/components/`:
   - `AppHeader.tsx`, `BottomTabBar.tsx`, `StickyActions.tsx`, `StatusPill.tsx`, 
     `Chip.tsx`, `Sheet.tsx`, `Skeleton.tsx`, `PrimaryButton.tsx`
   - Source for each is in `design_handoff_crm/components-tsx/`
5. Create `Frontend/src/hooks/useLoad.ts` from the source
6. Update `Frontend/src/App.tsx` to wrap routes in an AppShell that includes 
   `<BottomTabBar />` for routes that should show it (see README Step 4 — hide on 
   `/login`, `/register`, `/change-password`, `/orders/new`, `/orders/:id`, 
   `/menu/categories/:id`)
7. Stop. Run `npm run dev` and let me visit any existing page to confirm the 
   palette and font swap worked. The page layouts will look broken — that's expected.

### Phase 2 onward — Page rewrites

Once I've verified Phase 1, do one page per response. For each page:

1. Open the matching spec in `design_handoff_crm/screens/`
2. Open the corresponding `Screen*` function in `design_handoff_crm/prototype/screens.jsx` 
   or `screens-extra.jsx` for exact JSX + behavior
3. Open the existing page file in `Frontend/src/pages/`
4. Rewrite the JSX/className strings to match the prototype, translated to Tailwind v4 
   classes using the token mapping in `design-tokens.md`
5. KEEP all existing data fetching, mutations, navigation, validation, hooks, 
   permission gates, and i18n calls — only the visual layer changes
6. Sticky bottom CTAs are mandatory where the spec calls for them (Menu category, 
   Order detail, Cash, Warehouse, Clients, Staff, Schedule, Settings). User strongly 
   prefers sticky over in-flow buttons.

Phase 2 order (one per response):
- Dashboard
- Orders list + Order detail + New order flow (as one cohesive PR)
- Menu (categories) + Menu category (items)
- Tables
- Settings
- Reservations
- Reports
- Cash register
- Warehouse + Clients + Activity + Staff + Schedule (one PR — same pattern)
- Login + Register + ChangePassword

After each page, run `npm run lint` and `npm run build` to catch type/style errors 
before showing me. If you introduce new i18n strings, add them to BOTH `en.json` 
and `hy.json` (Armenian) — leave the Armenian as a `TODO:` value if you don't know 
the translation, I'll fill it in.

## Out of scope for this pass

- Dark mode (light mode only — the prototype has a dark toggle but ignore it)
- Backend changes
- Performance optimization (the prototype's animation system is fine as-is)
- New features beyond what's in the prototype

## When you're done

Open `Frontend/CLAUDE.md` and update the "What is implemented" section to reflect 
any new components added. Add a brief "Design system" note pointing future contributors 
at `design_handoff_crm/design-tokens.md`.

Start with Phase 1 only. Confirm what you understood from the docs before writing 
the first file, then proceed.
```

---

## Tips for working with Claude Code on this

- **Don't ask it to do everything at once.** Phase 1 first, then iterate. It will be tempted to "complete" the whole redesign in one shot — stop it and demand smaller diffs.
- **Open the prototype HTML side-by-side** in a browser while reviewing diffs. The .md specs describe the layout but the prototype is the source of truth for spacing and behavior.
- **After each phase, test on actual mobile.** Use `npm run start` + `npm run tunnel` per your Frontend/CLAUDE.md notes. Inside Telegram WebView the sticky CTAs interact with the on-screen keyboard differently than in a desktop browser — verify all forms.
- **When something looks wrong**, take a screenshot and tell Claude Code "compare to `design_handoff_crm/prototype/Restaurant CRM Redesign.html` open in browser at this screen". Visual diffing is more accurate than verbal description.
- **The translation file is large.** When Claude Code touches `hy.json` or `en.json`, sanity-check the diff — it's easy to corrupt JSON with brace mismatches.
