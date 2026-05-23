import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ProductDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatQuantity } from '../../lib/format'

type Filter = 'all' | 'low'

export default function WarehousePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const canManage = perm.has('ManageWarehouse')

  const [products, setProducts] = useState<ProductDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.products.getAll()
      setProducts(data)
    } catch {
      setError(t('warehouse.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Live updates — any teammate purchase / wastage refreshes the list.
  useRealtimeEvent('productChanged', () => { load() })

  // Build the category chip list from the already-loaded products — saves an extra API call.
  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).sort(),
    [products],
  )

  const visible = useMemo(() => {
    let list = products
    if (filter === 'low') list = list.filter(p => p.isLowStock)
    if (category) list = list.filter(p => p.category === category)
    return list
  }, [products, filter, category])

  // Group visible products by category for a clean sectioned list.
  const grouped = useMemo(() => {
    const map = new Map<string, ProductDto[]>()
    for (const p of visible) {
      const key = p.category ?? t('warehouse.uncategorized')
      const arr = map.get(key) ?? []
      arr.push(p)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [visible, t])

  const lowStockCount = products.filter(p => p.isLowStock).length

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('warehouse.title')}</h1>
          <p className="text-tg-hint text-sm mt-0.5">
            {t('warehouse.productCount', { count: products.length })}
            {lowStockCount > 0 && (
              <>
                <span className="mx-1.5">·</span>
                <span className="text-tg-destructive">{t('warehouse.lowStockCount', { count: lowStockCount })}</span>
              </>
            )}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => navigate('/warehouse/new')}
            className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium active:scale-[0.98] transition shrink-0"
          >
            + {t('warehouse.addProduct')}
          </button>
        )}
      </header>

      {/* Stock filter chips */}
      <div className="flex gap-2 mb-3">
        {(['all', 'low'] as Filter[]).map(k => {
          const active = filter === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={[
                'px-4 py-1.5 rounded-full text-xs font-medium transition',
                active ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
              ].join(' ')}
            >
              {t(`warehouse.filter.${k}`)}
            </button>
          )
        })}
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={[
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
              category === null ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
            ].join(' ')}
          >
            {t('warehouse.allCategories')}
          </button>
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
                category === c ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-tg-destructive text-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 px-6 text-center">
          <p className="text-tg-text font-medium">{t('warehouse.empty')}</p>
          <p className="text-tg-hint text-sm mt-1">{t('warehouse.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="text-xs text-tg-hint uppercase tracking-wider font-medium mb-2 px-1">{cat}</h2>
              <div className="flex flex-col gap-2">
                {items.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/warehouse/${p.id}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg active:scale-[0.98] transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-tg-hint mt-0.5 tabular-nums">
                        {formatQuantity(p.currentStock, p.unit)}
                        <span className="mx-1.5">·</span>
                        <span className="text-tg-hint">
                          {t('warehouse.minLabel')} {formatQuantity(p.lowStockThreshold, p.unit)}
                        </span>
                      </p>
                    </div>
                    {p.isLowStock && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-tg-destructive/10 text-tg-destructive">
                        {t('warehouse.low')}
                      </span>
                    )}
                    <span className="text-tg-hint text-xl leading-none shrink-0">›</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
