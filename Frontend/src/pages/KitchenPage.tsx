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
import { ChefHat, Check } from 'lucide-react'

/**
 * Kitchen Display System — grouped by ticket (order), the layout every mature KDS
 * (Toast, Square, TouchBistro) uses: a table's dishes stay together so the kitchen
 * fires and the expo plates them as one. Within a ticket the cook can advance a
 * single item, or bump the whole ticket in one tap.
 *
 *   • Ticket card per open order, FIFO (oldest order first).
 *   • Colour-coded urgency on the ticket age (green <5 min, yellow <10, red 10+),
 *     recomputed client-side every second — no API polling.
 *   • Per-item advance (Pending → Preparing → Ready → Served) and two ticket-level
 *     actions: "All ready" (→ Ready) and, once everything's ready, "Clear ticket"
 *     (→ Served, drops it off the board).
 *   • Realtime: `orderChanged` → refetch, so waiters adding items / cashiers
 *     closing orders / other cooks all reflect live.
 *
 * Permission: `MoveOrderItems` (cooks + bartenders by default).
 */

const STATUS_ORDER: OrderItemStatus[] = ['Pending', 'Preparing', 'Ready', 'Served']
type Filter = 'all' | 'Pending' | 'Preparing' | 'Ready'

interface Ticket {
  orderId: string
  tableNumber: number
  items: KitchenQueueItemDto[]
  oldestMs: number       // start of the oldest item's clock — the ticket's age
  allReady: boolean      // every item is Ready → kitchen done, awaiting pickup
}

// Urgency tiers tuned to restaurant prep times (Square/Toast defaults: 5 / 10 min).
function urgencyClasses(elapsedSeconds: number): { ring: string; badge: string } {
  if (elapsedSeconds < 300) return { ring: 'border-l-ok',     badge: 'bg-ok-soft text-ok'       }
  if (elapsedSeconds < 600) return { ring: 'border-l-warn',   badge: 'bg-warn-soft text-warn'   }
  return                         { ring: 'border-l-danger', badge: 'bg-danger-soft text-danger' }
}

function nextStatus(s: OrderItemStatus): OrderItemStatus | null {
  const i = STATUS_ORDER.indexOf(s)
  return i < 0 || i >= STATUS_ORDER.length - 1 ? null : STATUS_ORDER[i + 1]
}

function formatElapsed(secs: number, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (secs < 60) return t('kitchen.justNow')
  const mins = Math.floor(secs / 60)
  if (mins < 60) return t('kitchen.minAgo', { count: mins })
  return t('kitchen.hAgo', { count: Math.floor(mins / 60) })
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
  // Ticking clock so the elapsed badges + urgency colours refresh every second
  // without re-fetching the API.
  const [tick, setTick] = useState(0)
  // Tickets / items mid-flight, so a double-tap can't fire duplicate requests.
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

  const markBusy = (key: string, on: boolean) =>
    setBusy(s => { const n = new Set(s); on ? n.add(key) : n.delete(key); return n })

  // Advance a single item one step. Optimistic; a Served item drops off the board.
  const advanceItem = async (item: KitchenQueueItemDto) => {
    const next = nextStatus(item.status)
    if (!next) return
    markBusy(item.id, true)
    const prev = items
    setItems(cur => cur.flatMap(i =>
      i.id !== item.id ? [i] : next === 'Served' ? [] : [{ ...i, status: next }]))
    try {
      await api.orders.updateItemStatus(item.orderId, item.id, next)
    } catch (e) {
      setItems(prev)
      setError(e instanceof ApiError ? e.message : t('kitchen.errors.advanceFailed'))
    } finally {
      markBusy(item.id, false)
    }
  }

  // Bump every kitchen-side item on a ticket at once (atomic on the server).
  const bumpTicket = async (orderId: string, target: 'Ready' | 'Served') => {
    markBusy(orderId, true)
    const prev = items
    setItems(cur => cur.flatMap(i => {
      if (i.orderId !== orderId) return [i]
      if (target === 'Served') return []                                   // clears the ticket
      return i.status === 'Pending' || i.status === 'Preparing'
        ? [{ ...i, status: 'Ready' as OrderItemStatus }]
        : [i]
    }))
    try {
      await api.kitchen.bump(orderId, target)
    } catch (e) {
      setItems(prev)
      setError(e instanceof ApiError ? e.message : t('kitchen.errors.advanceFailed'))
    } finally {
      markBusy(orderId, false)
    }
  }

  // Per-status counts for the chips (across every item, ignoring the active filter).
  const counts = useMemo(() => ({
    all: items.length,
    Pending:   items.filter(i => i.status === 'Pending').length,
    Preparing: items.filter(i => i.status === 'Preparing').length,
    Ready:     items.filter(i => i.status === 'Ready').length,
  }), [items])

  // Group into tickets. The filter selects which tickets show (a ticket with ≥1
  // matching item), but the whole ticket renders — keeping the table's dishes
  // together is the entire point.
  const tickets = useMemo<Ticket[]>(() => {
    const byOrder = new Map<string, KitchenQueueItemDto[]>()
    for (const i of items) (byOrder.get(i.orderId) ?? byOrder.set(i.orderId, []).get(i.orderId)!).push(i)

    const result: Ticket[] = []
    for (const [orderId, list] of byOrder) {
      if (filter !== 'all' && !list.some(i => i.status === filter)) continue
      result.push({
        orderId,
        tableNumber: list[0].tableNumber,
        items: list,
        oldestMs: Math.min(...list.map(i => new Date(i.createdAt).getTime())),
        allReady: list.every(i => i.status === 'Ready'),
      })
    }
    // FIFO: oldest ticket first.
    return result.sort((a, b) => a.oldestMs - b.oldestMs)
  }, [items, filter])

  // Re-derive elapsed/urgency every second. `tick` is an intentional dep.
  const now = Date.now()
  void tick

  if (!canMove) {
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
        ) : tickets.length === 0 ? (
          <EmptyState icon={ChefHat}
                      title={t('kitchen.empty')}
                      hint={filter === 'all' ? t('kitchen.emptyHint') : t('kitchen.emptyFilterHint')} />
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket, idx) => {
              const elapsed = Math.max(0, Math.floor((now - ticket.oldestMs) / 1000))
              const urgency = ticket.allReady
                ? { ring: 'border-l-ok', badge: 'bg-ok-soft text-ok' }
                : urgencyClasses(elapsed)
              const ticketBusy = busy.has(ticket.orderId)

              return (
                <section
                  key={ticket.orderId}
                  className={`item-enter bg-card rounded-[18px] border-l-4 ${urgency.ring} overflow-hidden`}
                  style={{
                    animationDelay: `${Math.min(idx, 6) * 30}ms`,
                    boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  {/* Ticket header — table + age + ready badge */}
                  <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
                    <p className="m-0 flex-1 text-[15.5px] font-bold" style={{ letterSpacing: '-0.01em' }}>
                      {t('kitchen.table', { number: ticket.tableNumber })}
                    </p>
                    {ticket.allReady ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-ok-soft text-ok"
                            style={{ letterSpacing: '0.04em' }}>
                        <Check size={12} strokeWidth={3} aria-hidden /> {t('kitchen.readyBadge')}
                      </span>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[12px] font-bold tabular-nums ${urgency.badge}`}>
                        {formatElapsed(elapsed, t)}
                      </span>
                    )}
                  </div>

                  {/* Item rows */}
                  <ul className="m-0 px-3.5 pb-2 list-none flex flex-col gap-1.5">
                    {ticket.items.map(item => {
                      const next = nextStatus(item.status)
                      const showAdvance = next === 'Preparing' || next === 'Ready'
                      return (
                        <li key={item.id} className="flex items-center gap-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="m-0 text-[14.5px] font-semibold leading-tight" style={{ letterSpacing: '-0.005em' }}>
                              <span className="tabular-nums mr-1">×{item.quantity}</span>{item.menuItemName}
                            </p>
                            {item.notes && (
                              <p className="m-0 text-[12px] text-accent-press italic truncate">“{item.notes}”</p>
                            )}
                          </div>
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg text-fg-3"
                                style={{ letterSpacing: '0.04em' }}>
                            {t(`kitchen.status.${item.status}`)}
                          </span>
                          {showAdvance && (
                            <button
                              type="button"
                              onClick={() => advanceItem(item)}
                              disabled={busy.has(item.id) || ticketBusy}
                              className="tappable shrink-0 px-2.5 py-1.5 rounded-lg bg-bg text-accent text-[12.5px] font-semibold border-0 disabled:opacity-50"
                            >
                              {t(`kitchen.advance.${next}`)}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {/* Ticket-level action */}
                  <div className="px-3.5 pb-3 pt-1">
                    {ticket.allReady ? (
                      <button
                        type="button"
                        onClick={() => bumpTicket(ticket.orderId, 'Served')}
                        disabled={ticketBusy}
                        className="tappable w-full py-2.5 rounded-xl bg-ok text-white text-sm font-semibold border-0 disabled:opacity-50"
                      >
                        {t('kitchen.clearTicket')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bumpTicket(ticket.orderId, 'Ready')}
                        disabled={ticketBusy}
                        className="tappable w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold border-0 disabled:opacity-50"
                      >
                        {t('kitchen.allReady')}
                      </button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
