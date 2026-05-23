import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto } from '../../../lib/api'
import { useBackButton } from '../../../hooks/useBackButton'
import { useOrderDraft } from './OrderDraftContext'
import StepHeader from './StepHeader'
import CartBar from './CartBar'

export default function OrderCategoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()

  // In add-mode (existing order), `:id` is in the URL and there's no table picker.
  const addMode = !!id
  const backTarget = addMode ? `/orders/${id}` : '/orders/new'
  useBackButton(backTarget)

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

  const subtitle = addMode
    ? t('orders.selectItems')
    : `${t('orders.table')} ${draft.table!.number} · ${t('orders.selectItems')}`

  const itemsRoute = (catId: string) =>
    addMode ? `/orders/${id}/add-items/menu/${catId}` : `/orders/new/menu/${catId}`

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-32 max-w-md mx-auto w-full min-h-full">
      <StepHeader step={addMode ? 1 : 2} subtitle={subtitle} addMode={addMode} />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-tg-destructive text-sm">{error}</p>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">📋</div>
          <p className="text-tg-text font-medium">{t('menu.noCategories')}</p>
          <p className="text-tg-hint text-sm">{t('menu.noCategoriesHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {categories.map(cat => {
            const total = cat.items.filter(i => i.isAvailable).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(itemsRoute(cat.id))}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
              >
                <div className="w-11 h-11 shrink-0 rounded-xl bg-tg-bg flex items-center justify-center text-xl">
                  {pickEmoji(cat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-tg-text truncate">{cat.name}</p>
                  <p className="text-xs text-tg-hint mt-0.5">
                    {t('menu.itemCount', { count: total })}
                  </p>
                </div>
                <span className="text-tg-hint text-xl shrink-0">›</span>
              </button>
            )
          })}
        </div>
      )}

      <CartBar />
    </main>
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
