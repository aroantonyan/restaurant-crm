import type { ReactNode } from 'react'

interface Props {
  title?: string
  subtitle?: string
  onBack?: () => void
  trailing?: ReactNode
  /** When false, only the icon row renders. Use for forms where the title is in the form copy. */
  large?: boolean
}

/**
 * Telegram WebApp top safe area: status bar + Telegram chrome occupies the top.
 * `pt-[52px]` clears that. Adjust if your Telegram preview shows a different inset.
 *
 * The back chevron uses Telegram's BackButton via useBackButton() in pages — this
 * onBack is for the visible UI chevron. They should fire the same navigation.
 */
export default function AppHeader({ title, subtitle, onBack, trailing, large = true }: Props) {
  return (
    <div className="bg-bg pt-[52px] px-5 pb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2.5 min-h-9">
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
        <div className="flex-1" />
        {trailing}
      </div>
      {large && title && (
        <div className="px-1">
          <h1 className="m-0 text-[28px] font-bold text-fg" style={{ letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && <p className="m-0 mt-0.5 text-sm text-fg-3">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
