import type { ReactNode } from 'react'

interface Props {
  title?: string
  subtitle?: string
  onBack?: () => void
  trailing?: ReactNode
  /** Kept for call-site compatibility; the header is always the compact row now. */
  large?: boolean
}

/**
 * Compact single-row page header: back chevron on the left, title centered,
 * an optional action (e.g. +) on the right — all on one line. Balanced 36px
 * spacers on each side keep the title optically centered even when only one
 * side has a control.
 *
 * Top safe area: Telegram's bar lives OUTSIDE the WebView, so the WebView
 * starts at y=0; `pt-3` (12px) is just a breathing margin.
 *
 * The back chevron mirrors Telegram's BackButton (wired via useBackButton in
 * pages) — both fire the same navigation.
 */
export default function AppHeader({ title, subtitle, onBack, trailing }: Props) {
  return (
    <div className="bg-bg pt-3 px-3 pb-2.5">
      <div className="flex items-center gap-2 min-h-10">
        {/* Left slot — back button or spacer */}
        <div className="min-w-9 shrink-0 flex justify-start">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 rounded-full bg-[rgba(15,15,16,0.05)] text-fg-2 flex items-center justify-center tappable"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Center — title + optional subtitle */}
        <div className="flex-1 min-w-0 text-center px-1">
          {title && (
            <h1 className="m-0 text-[17px] font-bold text-fg truncate" style={{ letterSpacing: '-0.015em' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-3 truncate leading-tight">{subtitle}</p>
          )}
        </div>

        {/* Right slot — action or spacer */}
        <div className="min-w-9 shrink-0 flex justify-end">
          {trailing}
        </div>
      </div>
    </div>
  )
}
