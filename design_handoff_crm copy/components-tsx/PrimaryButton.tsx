import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Kind = 'primary' | 'neutral' | 'soft' | 'danger' | 'dangerSoft'
type Size = 'sm' | 'md' | 'lg'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  kind?: Kind
  size?: Size
  full?: boolean
  icon?: ReactNode
}

const KINDS: Record<Kind, string> = {
  primary:     'bg-accent text-white',
  neutral:     'bg-card text-fg shadow-[0_1px_0_rgba(15,15,16,.04),0_1px_3px_rgba(15,15,16,.05)]',
  soft:        'bg-accent-soft text-accent-press',
  danger:      'bg-danger text-white',
  dangerSoft:  'bg-danger-soft text-danger',
}
const SIZES: Record<Size, string> = {
  sm: 'py-2.5 px-4 text-sm',
  md: 'py-3.5 px-[18px] text-[15.5px]',
  lg: 'py-4 px-[18px] text-base',
}

/**
 * Replaces the existing `SubmitButton` component. Use:
 *   - `kind="primary"` for the main CTA (orange terracotta)
 *   - `kind="neutral"` for secondary actions like "Add" next to "Close & pay"
 *   - `kind="soft"` for tertiary actions inside accent contexts
 *   - `kind="dangerSoft"` for "Cancel order", "Delete item" before confirmation
 *   - `kind="danger"` for the confirm-step of a destructive action
 *
 * Keep your existing react-hook-form `isSubmitting` loading state — wrap with
 * a tiny disabled+opacity treatment like your current SubmitButton.
 */
export default function PrimaryButton({
  children,
  kind = 'primary',
  size = 'md',
  full = true,
  icon,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`${KINDS[kind]} ${SIZES[size]} rounded-2xl font-semibold tappable border-0 inline-flex items-center justify-center gap-2
        ${full ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`}
      style={{ letterSpacing: '-0.005em' }}
    >
      {icon}{children}
    </button>
  )
}
