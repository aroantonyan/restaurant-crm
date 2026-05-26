import type { ButtonHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

/**
 * Primary submit button shared by every react-hook-form. Visually matches
 * `PrimaryButton kind="primary"` from the new design system; kept as a
 * separate component because callers pass `loading` which auto-handles the
 * `disabled` + i18n "Loading…" text.
 */
export default function SubmitButton({ loading, children, className, disabled, ...rest }: Props) {
  const { t } = useTranslation()
  return (
    <button
      {...rest}
      disabled={loading || disabled}
      className={`w-full bg-accent text-white rounded-2xl py-3.5 px-[18px] font-semibold text-[15.5px]
        tappable border-0 disabled:opacity-50 ${className ?? ''}`}
      style={{ letterSpacing: '-0.005em' }}
    >
      {loading ? t('common.loading') : children}
    </button>
  )
}
