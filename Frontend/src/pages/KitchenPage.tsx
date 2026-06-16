import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type KitchenQueueItemDto, type OrderItemStatus } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'
import EmptyState from '../components/EmptyState'
import { SkeletonRow } from '../components/Skeleton'
import { ChefHat } from 'lucide-react'

/**
 * Kitchen Display System — single-tablet flat queue, FIFO (oldest first).
 *
 * Industry reference: this matches Square Restaurants KDS — one screen, all
 * items, color-coded urgency (green → yellow → red as time grows), one-tap
 * advance to the next status. Items that reach Served drop off automatically.
 *
 * Realtime: subscribes to `orderChanged`. Any mutation anywhere in the order
 * pipeline (create, item add/remove, status flip, pay/cancel) → refetch.
 *
 * Permission: `MoveOrderItems` — cooks and bartenders by default. The status
 * advance buttons call the existing PATCH /orders/{id}/items/{itemId}/status
 * endpoint, so the audit trail and realtime fan-out keep working.
 */

// Status colour palette + ordering. Pending/Preparing/Ready are the kitchen-side
// statuses we show; Served drops off the queue (the waiter has taken it out).
const STATUS_ORDER: OrderItemStatus[] = ['Pending', 'Preparing', 'Ready', 'Served']

type Filter = 'all' | 'Pending' | 'Preparing' | 'Ready'

interface UrgencyClasses {
  ring: string         // left border + accent
  badge: string        // elapsed-time pill
}

// Industry-standard KDS urgency tiers; tuned for restaurant prep times.
// Green = fresh, yellow = warning, red = overdue. Boundaries from observation
// of Square / Toast defaults (5 min, 10 min) — sensible for restaurant prep.
function urgencyFor(elapsedSeconds: number): UrgencyClasses {
  if (elapsedSeconds < 300) return { ring: 'border-l-ok',     badge: 'bg-ok-soft text-ok'       }
  if (elapsedSeconds < 600) return { ring: 'border-l-warn',   badge: 'bg-warn-soft text-warn'   }
  return                         { ring: 'border-l-danger', badge: 'bg-danger-soft text-danger' }
}

function nextStatus(s: OrderItemStatus): OrderItemStatus | null {
  const i = STATUS_ORDER.indexOf(s)
  if (i < 0 || i >= STATUS_ORDER.length - 1) return null
  return STATUS_ORDER[i + 1]
}

function formatElapsed(secs: number, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (secs < 60) return t('kitchen.justNow')
  const mins = Math.floor(secs / 60)
  if (mins < 60) return t('kitchen.minAgo', { count: mins })
  const hrs = Math.floor(mins / 60)
  return t('kitchen.hAgo', { count: hrs })
}

export default function KitchenPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const canMove = perm.has('MoveOrderItems')

  const [items, setItems] = useState<KitchenQueueItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  // A monotonically-ticking value so each card's elapsed-time badge re-renders
  // every second without re-fetching the API.
  const [tick, setTick] = useState(0)
  // Set of item ids that are mid-flight to avoid a double-tap creating duplicate
  // PATCH requests (and the cosmetic flicker of the button reappearing for a moment).
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const load = async () => {
    setError(null)
    try {
      setItems(await api.kitchen.queue())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('kitchen.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useRealtimeEvent('orderChanged', () => { void load() })

  useEffect(() => {
    const handle = window.setInterval(() => setTick(n => n + 1), 1000)
    return () => window.clearInterval(handle)
  }, [])

  const advance = async (item: KitchenQueueItemDto) => {
    const next = nextStatus(item.status)
    if (!next) return
    setBusy(s => new Set(s).add(item.id))
    // Optimistic: reflect the new status immediately so the cook sees the click
    // land; a failure rolls it back and surfaces the API error. Even if the
    // realtime refetch arrives first, the server-side state is authoritative.
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next } : i))
    try {
      await api.orders.updateItemStatus(item.orderId, item.id, next)
    } catch (e) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
      setError(e instanceof ApiError ? e.message : t('kitchen.errors.advanceFailed'))
    } finally {
      setBusy(s => { const n = new Set(s); n.delete(item.id); return n })
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(i => i.status === filter)
  }, [items, filter])

  // Counts for the chips. Live — recomputed when items change.
  const counts = useMemo(() => ({
    all: items.length,
    Pending:   items.filter(i => i.status === 'Pending').length,
    Preparing: items.filter(i => i.status === 'Preparing').length,
    Ready:     items.filter(i => i.status === 'Ready').length,
  }), [items])

  // Need this hook regardless of permission — must be before any early return.
  // The tick dep is intentional: re-derive elapsed seconds every second so the
  // urgency colour and badge text both refresh.
  const decorated = useMemo(() => {
    const now = Date.now()
    return filtered.map(i => {
      const elapsed = Math.max(0, Math.floor((now - new Date(i.createdAt).getTime()) / 1000))
      return { item: i, elapsed, urgency: urgencyFor(elapsed) }
    })
  }, [filtered, tick])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!canMove) {
    // Defence in depth — the dashboard already hides the tile, but a direct URL
    // typing wouldn't.
    return (
      <main className="page-enter h-full overflow-y-auto pb-7">
        <AppHeader onBack={() => navigate('/dashboard')} title={t('kitchen.title')} />
        <div className="px-5">
          <EmptyState icon={ChefHat} title={t('common.forbidden')} hint={t('kitchen.permissionHint')} />
        </div>
      </main>
    )
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('kitchen.title')}
        subtitle={t('kitchen.itemCount', { count: items.length })}
      />

      <div className="flex gap-2 px-5 pt-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <Chip active={filter === 'all'}       onClick={() => setFilter('all')}       count={counts.all}>{t('kitchen.filter.all')}</Chip>
        <Chip active={filter === 'Pending'}   onClick={() => setFilter('Pending')}   count={counts.Pending}>{t('kitchen.filter.Pending')}</Chip>
        <Chip active={filter === 'Preparing'} onClick={() => setFilter('Preparing')} count={counts.Preparing}>{t('kitchen.filter.Preparing')}</Chip>
        <Chip active={filter === 'Ready'}     onClick={() => setFilter('Ready')}     count={counts.Ready}>{t('kitchen.filter.Ready')}</Chip>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-[18px] bg-card py-8 text-center"
               style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
            <p className="m-0 text-sm text-danger mb-3">{error}</p>
            <button onClick={() => { setLoading(true); void load() }}
                    className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : decorated.length === 0 ? (
          <EmptyState icon={ChefHat}
                      title={t('kitchen.empty')}
                      hint={filter === 'all' ? t('kitchen.emptyHint') : t('kitchen.emptyFilterHint')} />
        ) : (
          <div className="flex flex-col gap-2">
            {decorated.map(({ item, elapsed, urgency }, idx) => {
              const next = nextStatus(item.status)
              const isBusy = busy.has(item.id)
              return (
                <div
                  key={item.id}
                  className={`item-enter bg-card rounded-[18px] py-3 px-3.5 flex flex-col gap-2 border-l-4 ${urgency.ring}`}
                  style={{
                    animationDelay: `${Math.min(idx, 6) * 30}ms`,
                    boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-[15.5px] font-semibold leading-tight" style={{ letterSpacing: '-0.005em' }}>
                        <span className="tabular-nums mr-1.5">×{item.quantity}</span>
                        {item.menuItemName}
                      </p>
                      <p className="m-0 mt-0.5 text-[12.5px] text-fg-3">
                        {t('kitchen.tablePrefix')}{item.tableNumber}
                        <span className="mx-1.5">·</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-md font-semibold tabular-nums ${urgency.badge}`}>
                          {formatElapsed(elapsed, t)}
                        </span>
                      </p>
                      {item.notes && (
                        <p className="m-0 mt-1 text-[12.5px] text-accent-press italic truncate">
                          “{item.notes}”
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-bg text-fg-2"
                          style={{ letterSpacing: '0.04em' }}>
                      {t(`kitchen.status.${item.status}`)}
                    </span>
                  </div>

                  {next && (
                    <button
                      type="button"
                      onClick={() => advance(item)}
                      disabled={isBusy}
                      className="tappable w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold border-0 disabled:opacity-50"
                    >
                      {t(`kitchen.advance.${next}`)}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
