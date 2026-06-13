import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto } from '../../../lib/api'
import { useOrderDraft } from './OrderDraftContext'
import { SkeletonRow } from '../../../components/Skeleton'
import StepHeader from './StepHeader'
import CartBar from './CartBar'

export default function OrderCategoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()

  // In add-mode (existing order), `:id` is in the URL and there's no table picker.
  // The table number arrives via nav state from the order detail page; seed it
  // into the draft so the header shows it across all add-item steps.
  const addMode = !!id
  const navTableNumber = (location.state as { tableNumber?: number } | null)?.tableNumber
  useEffect(() => {
    if (navTableNumber != null && draft.tableNumber == null) draft.setTableNumber(navTableNumber)
  }, [navTableNumber, draft])

  const backTarget = addMode ? `/orders/${id}` : '/orders/new'

  useEffect(() => {
    if (!addMode && !draft.table) navigate('/orders/new', { replace: true })
  }, [draft.table, addMode, navigate])

  const [categories, setCategories] = useState<MenuCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.menu.getAll()
      .then(setCategories)
      .catch(e => setError(e instanceof ApiError ? e.message : t('orders.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  if (!addMode && !draft.table) return null

  const subtitle = addMode ? t('orders.selectItems') : t('orders.step.pickItems')

  const itemsRoute = (catId: string) =>
    addMode ? `/orders/${id}/add-items/menu/${catId}` : `/orders/new/menu/${catId}`

  return (
    <main className="page-enter h-full overflow-y-auto pb-32">
      <StepHeader
        step={addMode ? 1 : 2}
        subtitle={subtitle}
        addMode={addMode}
        backTo={backTarget}
        tableNumber={draft.tableNumber ?? undefined}
      />

      <div className="px-5 flex flex-col gap-2">
        {loading ? (
          <>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</>
        ) : error ? (
          <p className="m-0 text-sm text-danger">{error}</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-12 px-4 gap-2">
            <div className="text-[40px] mb-2" aria-hidden>📋</div>
            <p className="m-0 text-base font-semibold text-fg">{t('menu.noCategories')}</p>
            <p className="m-0 text-sm text-fg-3">{t('menu.noCategoriesHint')}</p>
          </div>
        ) : (
          categories.map((cat, idx) => {
            const total = cat.items.filter(i => i.isAvailable).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(itemsRoute(cat.id))}
                className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3.5 px-3.5 flex items-center gap-3 text-left"
                style={{
                  animationDelay: `${idx * 35}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <div className="w-[46px] h-[46px] rounded-[14px] bg-bg flex items-center justify-center text-[22px] shrink-0">
                  {pickEmoji(cat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[15.5px] font-semibold truncate"
                     style={{ letterSpacing: '-0.005em' }}>
                    {cat.name}
                  </p>
                  <p className="m-0 mt-0.5 text-[12.5px] text-fg-3">
                    {t('menu.itemCount', { count: total })}
                  </p>
                </div>
                <span className="text-fg-4 shrink-0">
                  <ChevronIcon />
                </span>
              </button>
            )
          })
        )}
      </div>

      <CartBar />
    </main>
  )
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function pickEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('appet') || n.includes('starter')) return '🥗'
  if (n.includes('soup')) return '🍲'
  if (n.includes('main') || n.includes('grill') || n.includes('meat')) return '🍖'
  if (n.includes('salad')) return '🥬'
  if (n.includes('drink') || n.includes('beverage')) return '🥤'
  if (n.includes('wine') || n.includes('cocktail') || n.includes('bar')) return '🍷'
  if (n.includes('beer')) return '🍺'
  if (n.includes('coffee') || n.includes('tea')) return '☕'
  if (n.includes('dessert') || n.includes('sweet')) return '🍰'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('pasta') || n.includes('noodle')) return '🍝'
  if (n.includes('burger')) return '🍔'
  if (n.includes('seafood') || n.includes('fish')) return '🐟'
  if (n.includes('breakfast')) return '🍳'
  if (n.includes('bread')) return '🥖'
  return '🍽️'
}
