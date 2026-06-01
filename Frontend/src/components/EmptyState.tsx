import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  hint?: string
  /** Optional action rendered below the hint (e.g. a button). */
  children?: React.ReactNode
}

/**
 * Unified empty-state block. Replaces the per-page emoji + text stacks so every
 * "nothing here yet" screen shares one icon treatment, spacing, and type scale.
 */
export default function EmptyState({ icon: Icon, title, hint, children }: Props) {
  return (
    <div className="flex flex-col items-center text-center pt-14 px-6 gap-2">
      <div className="w-16 h-16 rounded-[20px] bg-muted flex items-center justify-center mb-1 text-fg-3">
        <Icon size={28} strokeWidth={1.9} aria-hidden />
      </div>
      <p className="m-0 text-base font-semibold text-fg">{title}</p>
      {hint && <p className="m-0 text-sm text-fg-3 max-w-[280px]">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
