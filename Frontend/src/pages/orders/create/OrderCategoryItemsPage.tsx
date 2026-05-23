import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto, type MenuItemDto } from '../../../lib/api'
import { useBackButton } from '../../../hooks/useBackButton'
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent'
import { useOrderDraft } from './OrderDraftContext'
import { formatPrice } from '../../../lib/format'
import StepHeader from './StepHeader'
import CartBar from './CartBar'
import ItemAddModal from './ItemAddModal'

export default function OrderCategoryItemsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, categoryId } = useParams<{ id?: string; categoryId: string }>()
  const draft = useOrderDraft()

  // Two modes share this page. `addMode` = adding items to existing order :id;
  // otherwise we're inside the new-order flow.
  const addMode = !!id
  const backTarget = addMode ? `/orders/${id}/add-items` : '/orders/new/menu'
  useBackButton(backTarget)

  useEffect(() => {
    // Only the new-order flow requires a selected table.
    if (!addMode && !draft.table) navigate('/orders/new', { replace: true })
  }, [draft.table, addMode, navigate])

  const [category, setCategory] = useState<MenuCategoryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<MenuItemDto | null>(null)

  const load = useCallback(() => {
    if (!categoryId) return
    setLoading(true)
    api.menu.getAll()
      .then(cats => {
        const found = cats.find(c => c.id === categoryId)
        if (!found) {
          setError(t('orders.errors.loadFailed'))
        } else {
          setCategory(found)
        }
      })
      .catch(e => setError(e instanceof ApiError ? e.message : t('orders.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [categoryId, t])

  useEffect(() => { load() }, [load])

  // Live refresh — a teammate paying an order can auto-86 items, and stock
  // changes flip canFulfill. Both should reflect on the picker without a manual refresh.
  useRealtimeEvent('menuItemChanged', load)
  useRealtimeEvent('productChanged', load)

  if (!addMode && !draft.table) return null

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-32 max-w-md mx-auto w-full min-h-full">
      <StepHeader
        step={2}
        subtitle={category ? category.name : t('common.loading')}
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-tg-destructive text-sm">{error}</p>
      ) : !category ? null : category.items.filter(i => i.isAvailable).length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center px-4">
          <p className="text-tg-text font-medium">{t('menu.noItems')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {category.items.filter(i => i.isAvailable).map(item => {
            const drafted = draft.getItem(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setModalItem(item)}
                className="w-full flex items-start justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-tg-text truncate">{item.name}</p>
                    {!item.canFulfill && (
                      <span
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600"
                        title={t('menu.lowIngredientsTitle')}
                      >
                        {t('menu.lowIngredients')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-tg-hint">{formatPrice(item.price)}</p>
                  {drafted?.notes && (
                    <p className="text-xs text-tg-hint mt-1 truncate italic">
                      “{drafted.notes}”
                    </p>
                  )}
                </div>
                <div className="ml-3 shrink-0 flex items-center gap-2">
                  {drafted ? (
                    <span className="inline-flex items-center justify-center h-9 min-w-9 px-3 rounded-xl bg-tg-button text-tg-button-text font-bold">
                      {drafted.quantity}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-tg-button text-tg-button-text text-xl font-bold">
                      +
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CartBar />

      {modalItem && (
        <ItemAddModal
          item={modalItem}
          initial={draft.getItem(modalItem.id)}
          onClose={() => setModalItem(null)}
        />
      )}
    </main>
  )
}
