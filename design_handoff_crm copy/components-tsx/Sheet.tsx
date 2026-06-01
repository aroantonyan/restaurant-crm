import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** 'auto' (max 78vh), 'tall' (88vh) — for client picker, payment, etc. */
  height?: 'auto' | 'tall'
}

/**
 * Bottom sheet — slides up from below with backdrop blur. Use for modals,
 * pickers, edit forms (menu item, table edit, payment method, client picker).
 *
 * Replaces the inline `<div className="fixed inset-0 z-50 …">` modals
 * sprinkled across TablesPage, MenuCategoryPage, OrderDetailPage etc.
 *
 * Animations are CSS — see tokens.css for sheet-in + backdrop-in keyframes.
 */
export default function Sheet({ open, onClose, title, children, height = 'auto' }: Props) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end backdrop-in"
      style={{ background: 'rgba(20, 18, 14, 0.42)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full bg-card rounded-t-[28px] px-5 pt-3 pb-7 sheet-in flex flex-col ${
          height === 'tall' ? 'max-h-[88vh]' : 'max-h-[78vh]'
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

        <div className="overflow-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
