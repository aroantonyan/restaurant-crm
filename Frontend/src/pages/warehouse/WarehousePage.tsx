import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ProductDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatQuantity } from '../../lib/format'
import AppHeader from '../../components/AppHeader'
import Chip from '../../components/Chip'
import StatusPill from '../../components/StatusPill'
import { SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { Package } from 'lucide-react'

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
      setProducts(await api.products.getAll())
    } catch {
      setError(t('warehouse.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useRealtimeEvent('productChanged', () => { load() })

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).sort(),
    [products],
  )

  const visible = useMemo(() => {
    let list = products
    if (filter === 'low') list = list.filter(p => p.isLowStock)
    if (category)         list = list.filter(p => p.category === category)
    return list
  }, [products, filter, category])

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
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('warehouse.title')}
        subtitle={t('warehouse.productCount', { count: products.length })}
        trailing={canManage ? (
          <button
            type="button"
            onClick={() => navigate('/warehouse/new')}
            aria-label={t('warehouse.addProduct')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      {lowStockCount > 0 && (
        <div className="mx-5 mb-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
          <p className="m-0 text-sm font-semibold text-warn">
            {t('warehouse.lowStockCount', { count: lowStockCount })}
          </p>
        </div>
      )}

      <div className="flex gap-2 px-5 pt-2 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('warehouse.filter.all')}</Chip>
        <Chip active={filter === 'low'} onClick={() => setFilter('low')}>{t('warehouse.filter.low')}</Chip>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip active={category === null} onClick={() => setCategory(null)}>{t('warehouse.allCategories')}</Chip>
          {categories.map(c => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>
      )}

      <div className="px-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-[18px] bg-card py-8 text-center"
               style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
            <p className="m-0 text-sm text-danger mb-3">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Package} title={t('warehouse.empty')} hint={t('warehouse.emptyHint')} />
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(([cat, items]) => (
              <section key={cat}>
                <p className="m-0 mb-2 px-1 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
                  {cat}
                </p>
                <div className="flex flex-col gap-2">
                  {items.map((p, idx) => {
                    const ratio = p.lowStockThreshold > 0
                      ? Math.min(1, p.currentStock / (p.lowStockThreshold * 2))
                      : 1
                    const barColor = p.isLowStock ? 'bg-warn' : 'bg-ok'
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => navigate(`/warehouse/${p.id}`)}
                        className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3 px-3.5 flex flex-col gap-2 text-left"
                        style={{
                          animationDelay: `${idx * 30}ms`,
                          boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="m-0 flex-1 min-w-0 text-[15px] font-semibold truncate"
                             style={{ letterSpacing: '-0.005em' }}>
                            {p.name}
                          </p>
                          {p.isLowStock && (
                            <StatusPill kind="warn" size="sm">{t('warehouse.low')}</StatusPill>
                          )}
                        </div>
                        <p className="m-0 text-[12.5px] text-fg-3 tabular-nums">
                          {formatQuantity(p.currentStock, p.unit)}
                          <span className="mx-1.5">·</span>
                          {t('warehouse.minLabel')} {formatQuantity(p.lowStockThreshold, p.unit)}
                        </p>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${ratio * 100}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
