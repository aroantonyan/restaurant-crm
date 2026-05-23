import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/format'
import { useOrderDraft } from './OrderDraftContext'

export default function CartBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()

  if (draft.totalItemsCount === 0) return null

  const reviewRoute = id ? `/orders/${id}/add-items/review` : '/orders/new/review'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-tg-bg/95 backdrop-blur border-t border-tg-secondary-bg px-5 py-4 z-30">
      <div className="max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate(reviewRoute)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition"
        >
          <span className="flex items-center gap-2">
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">{draft.totalItemsCount}</span>
            {t('orders.reviewCart')}
          </span>
          <span>{formatPrice(draft.total)} ›</span>
        </button>
      </div>
    </div>
  )
}
