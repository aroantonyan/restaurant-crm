import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ClientDto, type OrderDto, type OrderItemDto, type PaymentMethod } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatPrice } from '../../lib/format'
import AppHeader from '../../components/AppHeader'
import StatusPill from '../../components/StatusPill'
import StickyActions from '../../components/StickyActions'
import PrimaryButton from '../../components/PrimaryButton'
import Sheet from '../../components/Sheet'
import { SkeletonRow } from '../../components/Skeleton'
import OrderItemActionSheet from './OrderItemActionSheet'

type ItemKind = 'ok' | 'info' | 'muted' | 'warn'
function pillKindForItem(status: string): ItemKind {
  if (status === 'Ready')     return 'ok'
  if (status === 'Preparing') return 'info'
  if (status === 'Served')    return 'muted'
  return 'warn'
}

function orderPillKind(status: string): 'info' | 'ok' | 'muted' {
  if (status === 'Paid')      return 'ok'
  if (status === 'Cancelled') return 'muted'
  return 'info'
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/orders')

  const [order, setOrder] = useState<OrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionItem, setActionItem] = useState<OrderItemDto | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [pickingClient, setPickingClient] = useState(false)
  const [tickItem, setTickItem] = useState<string | null>(null)

  const canEdit       = perm.has('EditOrder')
  const canCancel     = perm.has('CancelOrder')
  const canMoveItems  = perm.has('MoveOrderItems')
  const canViewClient = perm.has('ViewClients')

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const ord = await api.orders.getById(id)
      setOrder(ord)
    } catch {
      setError(t('orders.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])
  useRealtimeEvent<{ orderId: string }>('orderChanged', ({ orderId }) => {
    if (orderId === id) load()
  })

  const handleCancel = async () => {
    if (!order) return
    setActionLoading(true)
    try {
      await api.orders.cancel(order.id)
      navigate('/orders', { replace: true })
    } catch {
      // swallow — list will reflect current state on next load
    } finally {
      setActionLoading(false)
      setConfirmCancel(false)
    }
  }

  const handlePay = async (method: PaymentMethod) => {
    if (!order) return
    setPayError(null)
    setActionLoading(true)
    try {
      await api.orders.markPaid(order.id, method)
      setPaying(false)
      navigate('/orders', { replace: true })
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="page-enter h-full overflow-y-auto pb-7">
        <AppHeader onBack={() => navigate('/orders')} title="…" />
        <div className="px-5 flex flex-col gap-2">
          {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
        </div>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-enter h-full overflow-y-auto pb-7">
        <AppHeader onBack={() => navigate('/orders')} title={t('orders.title')} />
        <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
          <p className="m-0 text-sm text-danger">{error ?? t('orders.errors.loadFailed')}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0"
          >
            {t('common.retry')}
          </button>
        </div>
      </main>
    )
  }

  const isOpen = order.status === 'Open'
  const grand  = order.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const itemTappable = isOpen && (canMoveItems || canEdit)

  return (
    <div className="relative h-full overflow-hidden">
      <main
        className={`page-enter h-full overflow-y-auto ${isOpen ? 'pb-[150px]' : 'pb-7'}`}
      >
        <AppHeader
          onBack={() => navigate('/orders')}
          title={`${t('orders.table')} ${order.tableNumber}`}
          subtitle={`${order.createdBy} · ${formatDateTime(order.createdAt)}`}
          trailing={
            <StatusPill kind={orderPillKind(order.status)}>
              {t(`orders.status.${order.status}`)}
            </StatusPill>
          }
        />

        {/* Client chip */}
        {isOpen && canEdit && canViewClient && (
          <div className="px-5 pb-3">
            <button
              type="button"
              onClick={() => setPickingClient(true)}
              className="tappable w-full py-3 px-3.5 bg-card border-0 rounded-2xl flex items-center gap-2.5 text-left"
              style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0" aria-hidden>
                👤
              </div>
              <span className={`flex-1 text-sm font-medium truncate ${order.clientName ? 'text-fg' : 'text-fg-3'}`}>
                {order.clientName ?? t('orders.client.assign')}
              </span>
              <span className="text-xs text-fg-3 shrink-0">
                {order.clientName ? t('orders.client.change') : ''}
              </span>
            </button>
          </div>
        )}
        {!isOpen && order.clientName && (
          <div className="px-5 pb-3">
            <p className="m-0 text-sm text-fg-2">
              <span className="mr-1.5" aria-hidden>👤</span>
              {order.clientName}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="px-5">
          <p className="m-0 mb-2.5 px-1 text-[11.5px] font-bold uppercase text-fg-3"
             style={{ letterSpacing: '0.06em' }}>
            Items · {order.items.length}
          </p>

          <div className="flex flex-col gap-2">
            {order.items.map((it, idx) => (
              <div
                key={it.id}
                className="item-enter bg-card rounded-[18px] py-3 px-3.5 flex items-start gap-3"
                style={{
                  animationDelay: `${idx * 35}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[14.5px] font-semibold" style={{ letterSpacing: '-0.005em' }}>
                    {it.menuItemName}
                  </p>
                  {it.notes && (
                    <p className="m-0 mt-0.5 text-xs italic text-accent-press truncate">
                      “{it.notes}”
                    </p>
                  )}
                  <p className="m-0 mt-1 text-[12.5px] text-fg-3">
                    {formatPrice(it.price)} × {it.quantity}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {itemTappable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionItem(it)
                        setTickItem(it.id)
                        setTimeout(() => setTickItem(null), 280)
                      }}
                      className="bg-transparent border-0 p-0 tappable"
                    >
                      <span key={tickItem === it.id ? 'a' : 'b'} className={tickItem === it.id ? 'tick inline-block' : 'inline-block'}>
                        <StatusPill kind={pillKindForItem(it.status)} size="sm">
                          {t(`orders.itemStatus.${it.status}`)}
                        </StatusPill>
                      </span>
                    </button>
                  ) : (
                    <StatusPill kind={pillKindForItem(it.status)} size="sm">
                      {t(`orders.itemStatus.${it.status}`)}
                    </StatusPill>
                  )}
                  <span className="text-sm font-bold tabular-nums" style={{ letterSpacing: '-0.005em' }}>
                    {formatPrice(it.price * it.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dark total bar */}
        <div className="px-5 pt-5">
          <div
            className="rounded-[18px] py-3.5 px-4.5 flex items-center justify-between"
            style={{
              background: 'var(--color-bg-inverse)',
              color: 'var(--color-fg-inverse)',
              boxShadow: '0 10px 24px -8px rgba(15,15,16,.14), 0 1px 3px rgba(15,15,16,.06)',
              padding: '14px 18px',
            }}
          >
            <span className="text-sm opacity-70" style={{ letterSpacing: '-0.005em' }}>{t('orders.total')}</span>
            <span key={grand} className="tick text-[22px] font-bold tabular-nums" style={{ letterSpacing: '-0.02em' }}>
              {formatPrice(grand)}
            </span>
          </div>
        </div>
      </main>

      {/* Sticky bottom action bar (only when Open) */}
      {isOpen && (
        <StickyActions hint={`${t('orders.total')} · ${formatPrice(grand)}`}>
          <div className="flex gap-2">
            {canEdit && (
              <PrimaryButton
                kind="neutral"
                onClick={() => navigate(`/orders/${order.id}/add-items`)}
                icon={<PlusIconSmall />}
              >
                {t('orders.addAction')}
              </PrimaryButton>
            )}
            {canEdit && (
              <PrimaryButton
                kind="primary"
                disabled={actionLoading}
                onClick={() => setPaying(true)}
              >
                {t('orders.closeAndPay')}
              </PrimaryButton>
            )}
          </div>
          {canCancel && !confirmCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="bg-transparent border-0 px-1 py-1 text-[12.5px] font-semibold text-danger self-center tappable"
            >
              {t('orders.cancel')}
            </button>
          )}
          {canCancel && confirmCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="bg-transparent border-0 px-1 py-1 text-[12.5px] font-semibold text-danger self-center tappable disabled:opacity-50"
            >
              {t('orders.cancelConfirm')}
            </button>
          )}
        </StickyActions>
      )}

      {/* Item action sheet */}
      {actionItem && (
        <OrderItemActionSheet
          orderId={order.id}
          item={actionItem}
          canMoveItems={canMoveItems && isOpen}
          canEdit={canEdit && isOpen}
          onClose={() => setActionItem(null)}
          onUpdated={updated => setOrder(updated)}
        />
      )}

      {/* Payment method sheet */}
      <PaymentMethodSheet
        open={paying}
        total={grand}
        hasClient={order.clientId !== null}
        busy={actionLoading}
        error={payError}
        onClose={() => { setPaying(false); setPayError(null) }}
        onPick={handlePay}
      />

      {/* Client picker sheet */}
      <ClientPicker
        open={pickingClient}
        currentClientId={order.clientId}
        onClose={() => setPickingClient(false)}
        onPick={async clientId => {
          try {
            const updated = await api.orders.assignClient(order.id, clientId)
            setOrder(updated)
            setPickingClient(false)
          } catch (e) {
            setError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
          }
        }}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function PlusIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/* ─── Payment method picker ─────────────────────────────────────── */

interface PaymentSheetProps {
  open: boolean
  total: number
  hasClient: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onPick: (method: PaymentMethod) => void
}

function PaymentMethodSheet({ open, total, hasClient, busy, error, onClose, onPick }: PaymentSheetProps) {
  const { t } = useTranslation()
  const methods: { value: PaymentMethod; icon: string }[] = [
    { value: 'Cash',         icon: '💵' },
    { value: 'Card',         icon: '💳' },
    { value: 'BankTransfer', icon: '🏦' },
    ...(hasClient ? [{ value: 'Deposit' as PaymentMethod, icon: '🪙' }] : []),
    { value: 'Other',        icon: '📝' },
  ]
  return (
    <Sheet open={open} onClose={onClose} title={t('orders.payment.title')}>
      <p className="m-0 mb-3.5 text-[13.5px] text-fg-3">
        {t('orders.payment.subtitle')}
        <strong className="ml-1 text-fg tabular-nums">{formatPrice(total)}</strong>
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {methods.map(m => (
          <button
            key={m.value}
            type="button"
            disabled={busy}
            onClick={() => onPick(m.value)}
            className="tappable border-0 bg-bg rounded-[18px] py-5 px-3 flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <span className="text-[28px]" aria-hidden>{m.icon}</span>
            <span className="text-[13.5px] font-semibold text-fg-2">
              {t(`orders.payment.methods.${m.value}`)}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="m-0 mt-4 text-sm text-danger text-center">{error}</p>
      )}
    </Sheet>
  )
}

/* ─── Client picker ─────────────────────────────────────────────── */

interface ClientPickerProps {
  open: boolean
  currentClientId: string | null
  onClose: () => void
  onPick: (clientId: string | null) => void
}

function ClientPicker({ open, currentClientId, onClose, onPick }: ClientPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => {
      setLoading(true)
      api.clients.getAll(search ? { search } : undefined)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search, open])

  return (
    <Sheet open={open} onClose={onClose} title={t('orders.client.title')} height="tall">
      <input
        type="search"
        autoFocus
        placeholder={t('clients.searchPlaceholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-muted text-fg rounded-xl px-4 py-3 text-base outline-none w-full mb-3"
      />

      {currentClientId && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="w-full mb-3 py-3 rounded-xl bg-danger-soft text-danger font-semibold tappable border-0"
        >
          × {t('orders.client.unassign')}
        </button>
      )}

      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="m-0 text-sm text-fg-3 text-center py-4">{t('common.loading')}</p>
        ) : results.length === 0 ? (
          <p className="m-0 text-sm text-fg-3 text-center py-4">{t('clients.empty')}</p>
        ) : results.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className="tappable border-0 flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-bg text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="m-0 text-sm font-semibold truncate">{c.fullName}</p>
              <p className="m-0 mt-0.5 text-[11px] text-fg-3 truncate">
                {c.phone ?? t('clients.noPhone')}
              </p>
            </div>
            <span className={`text-sm font-semibold tabular-nums ${c.depositBalance < 0 ? 'text-danger' : 'text-fg'}`}>
              {formatPrice(c.depositBalance)}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
