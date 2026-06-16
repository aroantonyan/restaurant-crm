import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ProductDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
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

  const canManage = perm.has('ManageWarehouse')

  const [products, setProducts] = useState<ProductDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  // Two-level navigation (like the Menu): a list of category cards, then the
  // products inside the one the user taps.
  const [openCategory, setOpenCategory] = useState<string | null>(null)

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

  const uncategorized = t('warehouse.uncategorized')
  const keyOf = (p: ProductDto) => p.category ?? uncategorized

  // One card per category, with its item count and how many are running low.
  const categories = useMemo(() => {
    const map = new Map<string, { count: number; low: number }>()
    for (const p of products) {
      const k = keyOf(p)
      const e = map.get(k) ?? { count: 0, low: 0 }
      e.count++
      if (p.isLowStock) e.low++
      map.set(k, e)
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, uncategorized])

  // Products shown inside the opened category, or — in "Low stock" mode — the
  // flat cross-category reorder list.
  const visible = useMemo(() => {
    if (filter === 'low') return products.filter(p => p.isLowStock)
    if (openCategory) return products.filter(p => keyOf(p) === openCategory)
    return []
  }, [products, filter, openCategory])

  const lowStockCount = products.filter(p => p.isLowStock).length
  const inCategory = filter === 'all' && openCategory !== null
  const showCards = filter === 'all' && openCategory === null

  const handleBack = () => {
    if (inCategory) { setOpenCategory(null); return }
    navigate('/dashboard')
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={handleBack}
        title={inCategory ? openCategory! : t('warehouse.title')}
        subtitle={inCategory
          ? t('warehouse.productCount', { count: visible.length })
          : t('warehouse.productCount', { count: products.length })}
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

      {lowStockCount > 0 && !inCategory && (
        <div className="mx-5 mb-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
          <p className="m-0 text-sm font-semibold text-warn">
            {t('warehouse.lowStockCount', { count: lowStockCount })}
          </p>
        </div>
      )}

      {/* Top filter — All / Low stock. Hidden while drilled into a category. */}
      {!inCategory && (
        <div className="flex gap-2 px-5 pt-2 pb-3" style={{ scrollbarWidth: 'none' }}>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t('warehouse.filter.all')}</Chip>
          <Chip active={filter === 'low'} onClick={() => { setFilter('low'); setOpenCategory(null) }}>{t('warehouse.filter.low')}</Chip>
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
        ) : showCards ? (
          categories.length === 0 ? (
            <EmptyState icon={Package} title={t('warehouse.empty')} hint={t('warehouse.emptyHint')} />
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((c, idx) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setOpenCategory(c.name)}
                  className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3.5 px-3.5 flex items-center gap-3 text-left"
                  style={{
                    animationDelay: `${idx * 35}ms`,
                    boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  <div className="w-[46px] h-[46px] rounded-[14px] bg-bg flex items-center justify-center text-fg-3 shrink-0">
                    <Package size={22} strokeWidth={1.9} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[15.5px] font-semibold truncate" style={{ letterSpacing: '-0.005em' }}>
                      {c.name}
                    </p>
                    <p className="m-0 mt-0.5 text-[12.5px] text-fg-3">
                      {t('warehouse.productCount', { count: c.count })}
                      {c.low > 0 && (
                        <span className="text-warn ml-1.5">· {t('warehouse.lowStockCount', { count: c.low })}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-fg-4 shrink-0"><ChevronIcon /></span>
                </button>
              ))}
            </div>
          )
        ) : visible.length === 0 ? (
          filter === 'low'
            ? <EmptyState icon={Package} title={t('warehouse.allStocked')} hint={t('warehouse.allStockedHint')} />
            : <EmptyState icon={Package} title={t('warehouse.empty')} hint={t('warehouse.emptyHint')} />
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((p, idx) => (
              <ProductRow key={p.id} product={p} idx={idx} onClick={() => navigate(`/warehouse/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function ProductRow({ product: p, idx, onClick }: { product: ProductDto; idx: number; onClick: () => void }) {
  const { t } = useTranslation()
  const ratio = p.lowStockThreshold > 0 ? Math.min(1, p.currentStock / (p.lowStockThreshold * 2)) : 1
  const barColor = p.isLowStock ? 'bg-warn' : 'bg-ok'
  return (
    <button
      type="button"
      onClick={onClick}
      className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3 px-3.5 flex flex-col gap-2 text-left"
      style={{
        animationDelay: `${idx * 30}ms`,
        boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
      }}
    >
      <div className="flex items-center gap-2">
        <p className="m-0 flex-1 min-w-0 text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.005em' }}>
          {p.name}
        </p>
        {p.isLowStock && <StatusPill kind="warn" size="sm">{t('warehouse.low')}</StatusPill>}
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
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
