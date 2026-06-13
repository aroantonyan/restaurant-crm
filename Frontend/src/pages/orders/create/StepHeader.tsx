import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../../components/AppHeader'

interface Props {
  step: 1 | 2 | 3
  subtitle?: string
  /** Adding items to an existing order — shows a 2-step bar instead of 3. */
  addMode?: boolean
  /** Where the on-screen back chevron should navigate. */
  backTo?: string
  /** Table number — shown in the title on every step so context is never lost. */
  tableNumber?: number
}

/**
 * Header for the multi-step new-order flow. Uses AppHeader for the title +
 * back chevron, and a small horizontal step rail underneath. The title carries
 * the table number on every step so the user always knows which table they're
 * building an order for.
 */
export default function StepHeader({ step, subtitle, addMode = false, backTo, tableNumber }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const totalSteps = addMode ? 2 : 3

  const baseTitle = addMode ? t('orders.addItem') : t('orders.new')
  const title = tableNumber != null
    ? `${baseTitle} · ${t('orders.table')} ${tableNumber}`
    : baseTitle

  return (
    <>
      <AppHeader
        onBack={backTo ? () => navigate(backTo) : undefined}
        title={title}
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
