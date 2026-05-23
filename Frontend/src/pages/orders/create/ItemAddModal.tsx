import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MenuItemDto } from '../../../lib/api'
import { formatPrice } from '../../../lib/format'
import { getTelegram } from '../../../lib/telegram'
import { useOrderDraft, type OrderDraftItem } from './OrderDraftContext'

interface Props {
  item: MenuItemDto
  initial?: OrderDraftItem  // when editing an item already in the draft
  onClose: () => void
}

/**
 * Bottom-sheet modal for adding/editing one menu item in the draft.
 * Shows qty stepper + free-form notes (e.g. "no onions", "extra spicy").
 * When `initial` is present, the form pre-fills and the primary button says "Update";
 * otherwise it says "Add". A "Remove" button appears when editing an in-cart item.
 */
export default function ItemAddModal({ item, initial, onClose }: Props) {
  const { t } = useTranslation()
  const draft = useOrderDraft()

  const [quantity, setQuantity] = useState(initial?.quantity ?? 1)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const isEdit = !!initial
  const canDecrement = quantity > 1

  const handleSubmit = () => {
    draft.upsertItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      notes: notes.trim() ? notes.trim() : undefined,
    })
    getTelegram()?.HapticFeedback?.impactOccurred('light')
    onClose()
  }

  const handleRemove = () => {
    draft.removeItem(item.id)
    getTelegram()?.HapticFeedback?.impactOccurred('light')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[92%] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{item.name}</h2>
            <p className="text-sm text-tg-hint mt-0.5">{formatPrice(item.price)}</p>
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

        {/* Qty stepper */}
        <div className="flex flex-col gap-1.5 mb-4">
          <span className="text-[13px] text-tg-hint uppercase tracking-wide px-1">
            {t('orders.quantity')}
          </span>
          <div className="flex items-center justify-between bg-tg-secondary-bg rounded-xl px-3 py-2">
            <button
              type="button"
              disabled={!canDecrement}
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-tg-bg text-tg-destructive text-xl font-bold disabled:opacity-30 active:scale-[0.95] transition"
              aria-label="−"
            >
              −
            </button>
            <span className="text-xl font-bold text-tg-text">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => Math.min(99, q + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-tg-button text-tg-button-text text-xl font-bold active:scale-[0.95] transition"
              aria-label="+"
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5 mb-5">
          <span className="text-[13px] text-tg-hint uppercase tracking-wide px-1">
            {t('orders.notes')}
          </span>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={t('orders.notesPlaceholder')}
            className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-tg-button transition scroll-mb-30 resize-none"
          />
        </div>

        {/* Running total preview */}
        <div className="flex items-center justify-between px-1 mb-4 text-sm">
          <span className="text-tg-hint">{t('orders.lineTotal')}</span>
          <span className="font-semibold text-tg-text">{formatPrice(item.price * quantity)}</span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition"
        >
          {isEdit ? t('orders.updateItem') : t('orders.addToOrder')}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={handleRemove}
            className="w-full mt-3 py-3 rounded-2xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
          >
            {t('orders.removeFromOrder')}
          </button>
        )}
      </div>
    </div>
  )
}
