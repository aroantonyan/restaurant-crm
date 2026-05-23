import { useTranslation } from 'react-i18next'

interface Props {
  step: 1 | 2 | 3
  subtitle?: string
  /** Adding items to an existing order — shows a 2-step bar instead of 3. */
  addMode?: boolean
}

// No back arrow — Telegram's system BackButton is the only back affordance.
export default function StepHeader({ step, subtitle, addMode = false }: Props) {
  const { t } = useTranslation()
  const totalSteps = addMode ? 2 : 3

  return (
    <header className="mb-5">
      <h1 className="text-2xl font-bold">
        {addMode ? t('orders.addItem') : t('orders.new')}
      </h1>
      <div className="flex gap-2 mt-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-tg-button' : 'bg-tg-secondary-bg'}`}
          />
        ))}
      </div>
      {subtitle && (
        <p className="text-tg-hint text-sm mt-3">{subtitle}</p>
      )}
    </header>
  )
}
