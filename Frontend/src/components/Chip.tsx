import type { ReactNode } from 'react'

interface Props {
  active: boolean
  onClick: () => void
  children: ReactNode
  /** Optional small number badge — `[All · 12]`. */
  count?: number
}

/**
 * Horizontal pill button used in filter rows (Orders status, Reservations day
 * scrubber, Reports range). Active = dark fill, inactive = white card.
 *
 * Render in a scrollable row:
 *   <div className="flex gap-2 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
 *     {options.map(o => <Chip key={o.value} active={...} onClick={...}>{o.label}</Chip>)}
 *   </div>
 */
export default function Chip({ active, onClick, children, count }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-[13.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap tappable border-0
        ${active
          ? 'bg-fg text-white'
          : 'bg-card text-fg-2 shadow-[0_1px_0_rgba(15,15,16,.04),0_1px_3px_rgba(15,15,16,.05)]'
        }`}
      style={{ letterSpacing: '-0.005em' }}
    >
      {children}
      {count !== undefined && (
        <span className={`text-[11px] font-semibold ${active ? 'opacity-70' : 'text-fg-3'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
