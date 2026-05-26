import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type OrderDto, type OrderItemDto } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { getTelegram } from '../../lib/telegram'
import Sheet from '../../components/Sheet'
import PrimaryButton from '../../components/PrimaryButton'

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
 * Bottom sheet for changing an order item's status (selection-based, not cycle)
 * and deleting the item. Same API as before — only the visual layer changed.
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
    <Sheet open onClose={onClose} title={item.menuItemName}>
      <p className="m-0 mb-4 text-sm text-fg-3">
        {formatPrice(item.price)} × {item.quantity}
        {item.notes && <> · <span className="italic text-accent-press">“{item.notes}”</span></>}
      </p>

      {canMoveItems && (
        <>
          <p className="m-0 mb-2 px-1 text-[11.5px] font-bold uppercase text-fg-3"
             style={{ letterSpacing: '0.06em' }}>
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
                  className={`tappable border-0 w-full py-3.5 px-4 rounded-2xl text-[15px] font-semibold text-left flex items-center justify-between
                    ${active ? 'bg-accent text-white' : 'bg-muted text-fg'}
                    disabled:opacity-50`}
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
        <p className="m-0 mb-3 text-sm text-danger text-center">{error}</p>
      )}

      {canEdit && (
        <div className="pt-3 border-t border-line">
          {!confirmDelete ? (
            <PrimaryButton kind="dangerSoft" onClick={() => setConfirmDelete(true)}>
              {t('orders.deleteItem')}
            </PrimaryButton>
          ) : (
            <div className="flex gap-2.5">
              <PrimaryButton kind="neutral" onClick={() => setConfirmDelete(false)}>
                {t('staff.edit.cancel')}
              </PrimaryButton>
              <PrimaryButton kind="danger" disabled={busy} onClick={handleDelete}>
                {busy ? t('common.loading') : t('orders.deleteItemConfirm')}
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
