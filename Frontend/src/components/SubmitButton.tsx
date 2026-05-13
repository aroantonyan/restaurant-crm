import type { ButtonHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export default function SubmitButton({ loading, children, ...rest }: Props) {
  const { t } = useTranslation()
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="bg-tg-button text-tg-button-text rounded-xl py-3.5 font-semibold text-base
        disabled:opacity-50 active:scale-[0.98] transition"
    >
      {loading ? t('common.loading') : children}
    </button>
  )
}
