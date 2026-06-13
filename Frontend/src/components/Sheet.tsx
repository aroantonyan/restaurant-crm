import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** 'auto' (max 78dvh), 'tall' (88dvh) — for client picker, payment, etc. */
  height?: 'auto' | 'tall'
}

/**
 * Bottom sheet — slides up from below with backdrop blur.
 *
 * IMPORTANT: rendered via React Portal directly under `<body>`.
 *
 * Why: `position: fixed` is supposed to anchor to the viewport, but per the
 * CSS spec, ANY ancestor with `transform`, `filter`, `perspective`, etc. set
 * to a non-`none` value becomes the containing block for fixed descendants
 * instead. Our pages use `.page-enter` whose animation leaves `transform:
 * translateY(0)` on the element — that's enough to break `fixed`. Portaling
 * the sheet to `body` escapes every transformed ancestor.
 *
 * This is the same pattern Radix, Headless UI, MUI, Mantine, and every
 * production modal library uses for the same reason.
 *
 * Keyboard handling: the outer container has `padding-bottom:
 * var(--keyboard-offset)`, which is updated globally from window.visualViewport
 * (see lib/viewport.ts). When the keyboard opens INSIDE a sheet, the sheet is
 * lifted above the keyboard rather than half-hidden behind it.
 *
 * Sizing: `dvh` (dynamic viewport height) shrinks with the keyboard on
 * iOS/Android, so `max-h: 78dvh` automatically gives a smaller sheet when the
 * keyboard is up — no jank, the sheet just sits above the keyboard.
 */
export default function Sheet({ open, onClose, title, children, height = 'auto' }: Props) {
  if (!open) return null

  const node = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end backdrop-in"
      style={{
        background: 'rgba(20, 18, 14, 0.42)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        // Lift the sheet above the on-screen keyboard.
        paddingBottom: 'var(--keyboard-offset, 0px)',
        transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full bg-card rounded-t-[28px] px-5 pt-3 pb-7 sheet-in flex flex-col ${
          height === 'tall' ? 'max-h-[88dvh]' : 'max-h-[78dvh]'
        }`}
        style={{ boxShadow: '0 -10px 36px -8px rgba(15,15,16,.18)' }}
      >
        {/* drag handle */}
        <div className="flex justify-center pb-2">
          <div className="w-9 h-1 rounded-full bg-line-strong" />
        </div>

        {title && (
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="m-0 text-[17px] font-bold" style={{ letterSpacing: '-0.01em' }}>{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-[rgba(15,15,16,0.05)] text-fg-2 flex items-center justify-center tappable"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
