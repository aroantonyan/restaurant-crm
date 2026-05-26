import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto, type MenuItemDto } from '../../../lib/api'
import { useBackButton } from '../../../hooks/useBackButton'
import { useRealtimeEvent } from '../../../hooks/useRealtimeEvent'
import { useOrderDraft } from './OrderDraftContext'
import { formatPrice } from '../../../lib/format'
import { SkeletonRow } from '../../../components/Skeleton'
import StepHeader from './StepHeader'
import CartBar from './CartBar'
import ItemAddModal from './ItemAddModal'

export default function OrderCategoryItemsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id, categoryId } = useParams<{ id?: string; categoryId: string }>()
  const draft = useOrderDraft()

  const addMode = !!id
  const backTarget = addMode ? `/orders/${id}/add-items` : '/orders/new/menu'
  useBackButton(backTarget)

  useEffect(() => {
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
        if (!found) setError(t('orders.errors.loadFailed'))
        else setCategory(found)
      })
      .catch(e => setError(e instanceof ApiError ? e.message : t('orders.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [categoryId, t])

  useEffect(() => { load() }, [load])
  useRealtimeEvent('menuItemChanged', load)
  useRealtimeEvent('productChanged', load)

  if (!addMode && !draft.table) return null

  return (
    <main className="page-enter h-full overflow-y-auto pb-32">
      <StepHeader
        step={addMode ? 1 : 2}
        addMode={addMode}
        subtitle={category ? category.name : t('common.loading')}
        backTo={backTarget}
      />

      <div className="px-5 flex flex-col gap-2">
        {loading ? (
          <>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</>
        ) : error ? (
          <p className="m-0 text-sm text-danger">{error}</p>
        ) : !category ? null : category.items.filter(i => i.isAvailable).length === 0 ? (
          <div className="flex flex-col items-center text-center pt-12 px-4 gap-2">
            <div className="text-[40px] mb-2" aria-hidden>🍽️</div>
            <p className="m-0 text-base font-semibold text-fg">{t('menu.noItems')}</p>
          </div>
        ) : (
          category.items.filter(i => i.isAvailable).map((item, idx) => {
            const drafted = draft.getItem(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setModalItem(item)}
                className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3 px-3.5 flex items-start gap-3 text-left"
                style={{
                  animationDelay: `${idx * 30}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="m-0 text-[15px] font-semibold truncate"
                       style={{ letterSpacing: '-0.005em' }}>
                      {item.name}
                    </p>
                    {!item.canFulfill && (
                      <span
                        className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-warn-soft text-warn"
                        style={{ letterSpacing: '0.04em' }}
                        title={t('menu.lowIngredientsTitle')}
                      >
                        {t('menu.lowIngredients')}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="m-0 mt-0.5 text-xs text-fg-3 truncate">{item.description}</p>
                  )}
                  <p className="m-0 mt-1 text-[13px] font-bold tabular-nums">
                    {formatPrice(item.price)}
                  </p>
                  {drafted?.notes && (
                    <p className="m-0 mt-1 text-xs text-accent-press italic truncate">
                      “{drafted.notes}”
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {drafted ? (
                    <span className="inline-flex items-center justify-center h-9 min-w-[44px] px-3 rounded-full bg-accent text-white text-sm font-bold tabular-nums">
                      {drafted.quantity}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent text-white">
                      <PlusIcon />
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
