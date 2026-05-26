import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../../lib/format'
import { useOrderDraft } from './OrderDraftContext'

/**
 * Floating cart bar that lives on the category-pick + category-items screens
 * inside the new-order flow. Pops up when the draft has any items.
 *
 * Uses fixed positioning + translucent blur to mirror the BottomTabBar / sticky
 * action style across the rest of the app.
 */
export default function CartBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()

  if (draft.totalItemsCount === 0) return null

  const reviewRoute = id ? `/orders/${id}/add-items/review` : '/orders/new/review'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-4 pt-3 border-t border-line z-30"
      style={{
        background: 'var(--color-bar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom)) + var(--keyboard-offset, 0px))',
        transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <button
        type="button"
        onClick={() => navigate(reviewRoute)}
        className="tappable w-full bg-accent text-white border-0 rounded-2xl py-3.5 px-4 flex items-center justify-between font-semibold"
        style={{ letterSpacing: '-0.005em' }}
      >
        <span className="flex items-center gap-2">
          <span className="pop inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-white/20 text-sm tabular-nums">
            {draft.totalItemsCount}
          </span>
          <span className="text-[15.5px]">{t('orders.reviewCart')}</span>
        </span>
        <span className="text-[15.5px] tabular-nums">
          {formatPrice(draft.total)}
        </span>
      </button>
    </div>
  )
}
