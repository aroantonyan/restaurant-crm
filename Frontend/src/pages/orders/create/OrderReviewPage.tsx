import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuItemDto } from '../../../lib/api'
import { useBackButton } from '../../../hooks/useBackButton'
import { useOrderDraft, type OrderDraftItem } from './OrderDraftContext'
import { formatPrice } from '../../../lib/format'
import { getTelegram } from '../../../lib/telegram'
import StepHeader from './StepHeader'
import ItemAddModal from './ItemAddModal'

export default function OrderReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()

  const addMode = !!id
  const menuRoute = addMode ? `/orders/${id}/add-items` : '/orders/new/menu'
  useBackButton(menuRoute)

  // Guard — new-order flow requires a table.
  useEffect(() => {
    if (!addMode && !draft.table) navigate('/orders/new', { replace: true })
  }, [draft.table, addMode, navigate])

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrderDraftItem | null>(null)

  const handleSubmit = async () => {
    if (draft.items.length === 0) return
    setSubmitting(true)
    setServerError(null)
    try {
      if (addMode && id) {
        // Add each draft item to the existing order, one by one.
        for (const item of draft.items) {
          await api.orders.addItem(id, {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
          })
        }
        getTelegram()?.HapticFeedback?.impactOccurred('light')
        draft.clear()
        navigate(`/orders/${id}`, { replace: true })
      } else if (draft.table) {
        const order = await api.orders.create({
          tableId: draft.table.id,
          items: draft.items.map(i => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        })
        getTelegram()?.HapticFeedback?.impactOccurred('light')
        draft.clear()
        navigate(`/orders/${order.id}`, { replace: true })
      }
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
      setSubmitting(false)
    }
  }

  if (!addMode && !draft.table) return null

  const subtitle = addMode
    ? t('orders.reviewBeforeAdding')
    : `${t('orders.table')} ${draft.table!.number}`

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <StepHeader step={addMode ? 2 : 3} subtitle={subtitle} addMode={addMode} />

      {draft.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">🛒</div>
          <p className="text-tg-text font-medium">{t('orders.cartEmpty')}</p>
          <button
            type="button"
            onClick={() => navigate(menuRoute)}
            className="mt-2 px-4 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium"
          >
            {t('orders.addItem')}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-6">
            {draft.items.map(item => (
              <button
                key={item.menuItemId}
                type="button"
                onClick={() => setEditing(item)}
                className="w-full text-left flex items-start justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg active:scale-[0.98] transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-tg-text truncate">{item.name}</p>
                  <p className="text-sm text-tg-hint">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-tg-hint mt-1 italic truncate">“{item.notes}”</p>
                  )}
                </div>
                <span className="text-base font-semibold text-tg-text ml-3 shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(menuRoute)}
            className="mb-4 px-4 py-2.5 rounded-xl bg-tg-secondary-bg text-tg-text text-sm font-medium"
          >
            + {t('orders.addItem')}
          </button>

          <div className="mt-auto pt-4 border-t border-tg-secondary-bg">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm text-tg-hint">{t('orders.total')}</span>
              <span className="text-xl font-bold text-tg-text">{formatPrice(draft.total)}</span>
            </div>
            {serverError && <p className="text-tg-destructive text-sm text-center mb-2">{serverError}</p>}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition disabled:opacity-60"
            >
              {submitting
                ? t('common.loading')
                : addMode
                  ? t('orders.addToOrder')
                  : t('orders.confirmOrder')}
            </button>
          </div>
        </>
      )}

      {editing && (
        <ItemAddModal
          // The modal expects MenuItemDto. We synthesize a minimal one from the draft item —
          // only id/name/price are read by the modal.
          item={{
            id: editing.menuItemId,
            name: editing.name,
            price: editing.price,
            categoryId: '',
            categoryName: '',
            description: null,
            photoUrl: null,
            isAvailable: true,
          } as MenuItemDto}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  )
}
