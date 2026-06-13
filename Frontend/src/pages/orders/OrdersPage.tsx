import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type OrderDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatPrice } from '../../lib/format'
import AppHeader from '../../components/AppHeader'
import Chip from '../../components/Chip'
import StatusPill from '../../components/StatusPill'
import { SkeletonRow } from '../../components/Skeleton'
import SharedEmptyState from '../../components/EmptyState'
import { Inbox } from 'lucide-react'

type Filter = 'Open' | 'Paid' | 'Cancelled' | 'all'

export default function OrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()

  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('Open')

  const canCreate = perm.has('CreateOrder')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.orders.getAll()
      setOrders(data)
    } catch {
      setError(t('orders.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useRealtimeEvent('orderChanged', () => { load() })

  const counts = useMemo(() => ({
    all:       orders.length,
    Open:      orders.filter(o => o.status === 'Open').length,
    Paid:      orders.filter(o => o.status === 'Paid').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  }), [orders])

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const subtitle = counts.Open > 0
    ? t('orders.subtitle', { count: counts.Open })
    : t('orders.subtitleEmpty')

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        title={t('orders.title')}
        subtitle={subtitle}
        trailing={canCreate ? (
          <button
            type="button"
            onClick={() => navigate('/orders/new')}
            aria-label={t('orders.new')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      {/* Filter chips */}
      <div
        className="flex gap-2 px-5 pt-2 pb-3.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <Chip active={filter === 'Open'}      onClick={() => setFilter('Open')}      count={counts.Open}>{t('orders.filter.open')}</Chip>
        <Chip active={filter === 'Paid'}      onClick={() => setFilter('Paid')}      count={counts.Paid}>{t('orders.filter.paid')}</Chip>
        <Chip active={filter === 'Cancelled'} onClick={() => setFilter('Cancelled')} count={counts.Cancelled}>{t('orders.filter.cancelled')}</Chip>
        <Chip active={filter === 'all'}       onClick={() => setFilter('all')}       count={counts.all}>{t('orders.filter.all')}</Chip>
      </div>

      <div className="px-5 flex flex-col gap-2">
        {loading ? (
          <>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState />
        ) : (
          visible.map((o, idx) => <OrderRow key={o.id} order={o} idx={idx} onClick={() => navigate(`/orders/${o.id}`)} t={t} />)
        )}
      </div>
    </main>
  )
}

/* ──────────────────────────────────────────────────────────────── */

interface RowProps {
  order: OrderDto
  idx: number
  onClick: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function OrderRow({ order, idx, onClick, t }: RowProps) {
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)
  const allReady = order.items.length > 0 && order.items.every(i => i.status === 'Ready' || i.status === 'Served')

  const pillKind: 'info' | 'ok' | 'muted' =
    order.status === 'Paid' ? 'ok' :
    order.status === 'Cancelled' ? 'muted' :
    allReady ? 'ok' : 'info'

  const pillLabel = order.status === 'Open' && allReady
    ? t('orders.ready')
    : t(`orders.status.${order.status}`)

  const itemsPreview = order.items.map(i => i.menuItemName).join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3.5 px-4 text-left flex flex-col gap-2.5"
      style={{
        animationDelay: `${idx * 35}ms`,
        boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
      }}
    >
      {/* Top row: №-badge + table/client + meta + status pill */}
      <div className="flex items-center gap-2.5">
        <div className="w-[38px] h-[38px] rounded-xl bg-muted flex items-center justify-center text-fg-2 font-bold text-[15px] shrink-0"
             style={{ letterSpacing: '-0.01em' }}>
          <span className="text-[9px] font-bold text-fg-4 mr-px">№</span>
          {order.tableNumber}
        </div>

        <div className="flex-1 min-w-0">
          <p className="m-0 text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.005em' }}>
            {t('orders.table')} {order.tableNumber}
            {order.clientName && (
              <span className="text-[13px] text-fg-3 font-medium ml-1.5">
                · {order.clientName.split(' ')[0]}
              </span>
            )}
          </p>
          <p className="m-0 mt-0.5 text-xs text-fg-3 truncate">
            {t('orders.items', { count: itemCount })}
            <span className="mx-1.5">·</span>
            {order.createdBy}
            <span className="mx-1.5">·</span>
            {formatElapsed(order.createdAt, t)}
          </p>
        </div>

        <StatusPill kind={pillKind} size="sm">{pillLabel}</StatusPill>
      </div>

      {/* Bottom row: items preview + bold total */}
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[12.5px] text-fg-3 clamp-1 flex-1 min-w-0">
          {itemsPreview}
        </p>
        <p className="m-0 text-[14.5px] font-bold tabular-nums shrink-0"
           style={{ letterSpacing: '-0.01em' }}>
          {formatPrice(order.total)}
        </p>
      </div>
    </button>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return <SharedEmptyState icon={Inbox} title={t('orders.noOrders')} hint={t('orders.noOrdersHint')} />
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center text-center px-6 py-16 gap-3">
      <p className="m-0 text-sm text-danger">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}

/**
 * Convert an ISO timestamp into a short relative label:
 *   "just now" / "32m ago" / "2h ago" / "3d ago".
 * Anything older than 7 days falls back to "Xd ago".
 */
function formatElapsed(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60_000)
  if (m < 1)    return t('orders.elapsedJustNow')
  if (m < 60)   return t('orders.elapsedMin',  { n: m })
  const h = Math.floor(m / 60)
  if (h < 24)   return t('orders.elapsedHour', { n: h })
  const d = Math.floor(h / 24)
  return t('orders.elapsedDay', { n: d })
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
