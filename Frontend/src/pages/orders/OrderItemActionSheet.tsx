import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type OrderDto, type OrderItemDto } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { getTelegram } from '../../lib/telegram'

const STATUSES = ['Pending', 'Preparing', 'Ready', 'Served'] as const
type ItemStatus = (typeof STATUSES)[number]

interface Props {
  orderId: string
  item: OrderItemDto
  canMoveItems: boolean
  canEdit: boolean
  onClose: () => void
  onUpdated: (order: OrderDto) => void
}

/**
 * Bottom-sheet that lets the user change an order item's status by selection
 * (replacing the previous click-to-cycle behavior) and delete the item.
 */
export default function OrderItemActionSheet({
  orderId, item, canMoveItems, canEdit, onClose, onUpdated,
}: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatus = async (status: ItemStatus) => {
    if (!canMoveItems || status === item.status) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api.orders.updateItemStatus(orderId, item.id, status)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onUpdated(updated)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!canEdit) return
    setBusy(true)
    setError(null)
    try {
      const updated = await api.orders.removeItem(orderId, item.id)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onUpdated(updated)
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('orders.errors.deleteItemFailed'))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[92%] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{item.menuItemName}</h2>
            <p className="text-sm text-tg-hint mt-0.5">
              {formatPrice(item.price)} × {item.quantity}
              {item.notes && <> · <span className="italic">“{item.notes}”</span></>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none shrink-0"
            aria-label={t('common.back')}
          >
            ×
          </button>
        </div>

        {canMoveItems && (
          <>
            <p className="text-[13px] text-tg-hint uppercase tracking-wide mb-2 px-1">
              {t('orders.changeStatus')}
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {STATUSES.map(status => {
                const active = item.status === status
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={busy}
                    onClick={() => handleStatus(status)}
                    className={[
                      'w-full py-3.5 rounded-2xl text-sm font-medium text-left px-5 active:scale-[0.98] transition flex items-center justify-between',
                      active
                        ? 'bg-tg-button text-tg-button-text'
                        : 'bg-tg-secondary-bg text-tg-text',
                    ].join(' ')}
                  >
                    <span>{t(`orders.itemStatus.${status}`)}</span>
                    {active && <span aria-hidden>✓</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {error && (
          <p className="text-tg-destructive text-sm text-center mb-3">{error}</p>
        )}

        {canEdit && (
          <div className="pt-3 border-t border-tg-secondary-bg">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
              >
                {t('orders.deleteItem')}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-text font-medium"
                >
                  {t('staff.edit.cancel')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDelete}
                  className="flex-1 py-3.5 rounded-2xl bg-tg-destructive text-white font-medium disabled:opacity-50"
                >
                  {busy ? t('common.loading') : t('orders.deleteItemConfirm')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
