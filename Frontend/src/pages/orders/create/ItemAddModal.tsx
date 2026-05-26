import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MenuItemDto } from '../../../lib/api'
import { formatPrice } from '../../../lib/format'
import { getTelegram } from '../../../lib/telegram'
import { useOrderDraft, type OrderDraftItem } from './OrderDraftContext'
import Sheet from '../../../components/Sheet'
import PrimaryButton from '../../../components/PrimaryButton'

interface Props {
  item: MenuItemDto
  initial?: OrderDraftItem  // when editing an item already in the draft
  onClose: () => void
}

/**
 * Bottom-sheet for adding/editing one menu item in the draft.
 * Qty stepper + free-form notes. When `initial` is present, the form pre-fills
 * and the primary button says "Update"; otherwise "Add".
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
      name:       item.name,
      price:      item.price,
      quantity,
      notes:      notes.trim() ? notes.trim() : undefined,
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
    <Sheet open onClose={onClose} title={item.name}>
      <p className="m-0 mb-4 text-sm text-fg-3 tabular-nums">{formatPrice(item.price)}</p>

      {/* Qty stepper */}
      <div className="mb-4">
        <p className="m-0 mb-1.5 px-1 text-[11.5px] font-bold uppercase text-fg-3"
           style={{ letterSpacing: '0.06em' }}>
          {t('orders.quantity')}
        </p>
        <div className="flex items-center justify-between bg-muted rounded-2xl px-2 py-2">
          <button
            type="button"
            disabled={!canDecrement}
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-11 h-11 rounded-full bg-card text-fg flex items-center justify-center text-xl font-bold disabled:opacity-30 tappable border-0"
            aria-label="−"
          >
            −
          </button>
          <span className="text-[26px] font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.02em' }}>
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(q => Math.min(99, q + 1))}
            className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold tappable border-0"
            aria-label="+"
          >
            +
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <p className="m-0 mb-1.5 px-1 text-[11.5px] font-bold uppercase text-fg-3"
           style={{ letterSpacing: '0.06em' }}>
          {t('orders.notes')}
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder={t('orders.notesPlaceholder')}
          className="w-full bg-muted text-fg rounded-2xl px-4 py-3 text-base outline-none scroll-mb-30 resize-none"
        />
      </div>

      {/* Running total */}
      <div className="flex items-center justify-between px-1 mb-4 text-sm">
        <span className="text-fg-3">{t('orders.lineTotal')}</span>
        <span className="font-bold text-fg tabular-nums">{formatPrice(item.price * quantity)}</span>
      </div>

      <PrimaryButton kind="primary" onClick={handleSubmit}>
        {isEdit ? t('orders.updateItem') : t('orders.addToOrder')}
      </PrimaryButton>

      {isEdit && (
        <div className="mt-2.5">
          <PrimaryButton kind="dangerSoft" onClick={handleRemove}>
            {t('orders.removeFromOrder')}
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  )
}
