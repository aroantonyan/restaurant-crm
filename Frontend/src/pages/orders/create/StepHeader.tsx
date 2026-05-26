import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../../components/AppHeader'

interface Props {
  step: 1 | 2 | 3
  subtitle?: string
  /** Adding items to an existing order — shows a 2-step bar instead of 3. */
  addMode?: boolean
  /** Where the on-screen back chevron should navigate (mirrors useBackButton on each page). */
  backTo?: string
}

/**
 * Header for the multi-step new-order flow. Uses AppHeader for the title +
 * back chevron, and a small horizontal step rail underneath.
 */
export default function StepHeader({ step, subtitle, addMode = false, backTo }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const totalSteps = addMode ? 2 : 3

  return (
    <>
      <AppHeader
        onBack={backTo ? () => navigate(backTo) : undefined}
        title={addMode ? t('orders.addItem') : t('orders.new')}
        subtitle={subtitle || t('orders.step.of', { n: step })}
      />
      <div className="px-5 pb-3 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${i + 1 <= step ? 'bg-accent' : 'bg-muted'}`}
          />
        ))}
      </div>
    </>
  )
}
