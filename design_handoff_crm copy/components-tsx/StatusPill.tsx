import type { ReactNode } from 'react'

type Kind = 'ok' | 'warn' | 'info' | 'danger' | 'muted'
type Size = 'sm' | 'md'

const MAP: Record<Kind, { text: string; bg: string; dot: string }> = {
  ok:     { text: 'text-ok',     bg: 'bg-ok-soft',     dot: 'bg-ok'     },
  warn:   { text: 'text-warn',   bg: 'bg-warn-soft',   dot: 'bg-warn'   },
  info:   { text: 'text-info',   bg: 'bg-info-soft',   dot: 'bg-info'   },
  danger: { text: 'text-danger', bg: 'bg-danger-soft', dot: 'bg-danger' },
  muted:  { text: 'text-fg-3',   bg: 'bg-muted',       dot: 'bg-fg-3'   },
}

interface Props {
  kind: Kind
  children: ReactNode
  /** Show the leading dot. Default true. */
  dot?: boolean
  size?: Size
}

/**
 * Compact status indicator — `[● Open]`, `[● Free]`, etc.
 * Used everywhere a state needs to be communicated: order status, table status,
 * reservation status, item availability, staff role, etc.
 *
 * Mapping table (apply consistently across screens):
 *   - Open / Reserved / Preparing                 → 'info'
 *   - Paid / Free / Ready / Confirmed / Active    → 'ok'
 *   - Occupied / Pending / Unavailable / Low stock → 'warn'
 *   - Cancelled / Inactive / Past                 → 'muted'
 *   - Destructive states (deleted, error)         → 'danger'
 */
export default function StatusPill({ kind, children, dot = true, size = 'md' }: Props) {
  const { text, bg, dotBg } = { ...MAP[kind], dotBg: MAP[kind].dot }
  const dims = size === 'sm'
    ? 'text-[11px] py-[3px] pl-[7px] pr-2'
    : 'text-xs py-1 pl-[9px] pr-2.5'
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full font-semibold whitespace-nowrap ${bg} ${text} ${dims}`}
      style={{ letterSpacing: '-0.005em' }}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />}
      {children}
    </span>
  )
}
