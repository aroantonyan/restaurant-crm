import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional small hint line above the buttons — e.g. "Total · 13,400 ֏". */
  hint?: ReactNode
  /** Tighter vertical padding when used as a sub-element. */
  dense?: boolean
}

/**
 * Floating, glass-blurred action bar pinned to the bottom of the screen
 * scroll container. Sits above the BottomTabBar (or replaces it on focused
 * flows).
 *
 * IMPORTANT: the page's outer scroll container must have enough paddingBottom
 * (96px when this is used; 140px if it has a hint + multiple buttons + a
 * destructive secondary action below). Otherwise the last list item slides
 * under the bar.
 *
 * Use absolute positioning + a wrapping relative scroll container:
 *
 *   <div className="relative h-full overflow-hidden">
 *     <div className="h-full overflow-y-auto pb-24">{listItems}</div>
 *     <StickyActions>…</StickyActions>
 *   </div>
 *
 * If your page sits directly under <main> in a flex column with overflow:auto,
 * use `fixed` + `bottom-[64px]` to clear the tab bar. Adapt per existing layout.
 */
export default function StickyActions({ children, hint, dense = false }: Props) {
  return (
    <div
      className={`absolute left-0 right-0 bottom-0 border-t border-line flex flex-col gap-2 z-30 ${
        dense ? 'px-4 pt-2.5' : 'px-4 pt-3'
      }`}
      style={{
        background: 'var(--color-bar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // Float above the on-screen keyboard. Falls back to the home-indicator
        // inset (or a 16/14px floor) when no keyboard is open.
        paddingBottom: dense
          ? 'calc(max(14px, env(safe-area-inset-bottom)) + var(--keyboard-offset, 0px))'
          : 'calc(max(16px, env(safe-area-inset-bottom)) + var(--keyboard-offset, 0px))',
        transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {hint && <div className="text-xs text-fg-3 text-center">{hint}</div>}
      {children}
    </div>
  )
}
