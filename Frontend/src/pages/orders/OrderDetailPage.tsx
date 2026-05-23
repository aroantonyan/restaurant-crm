import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ClientDto, type OrderDto, type OrderItemDto, type PaymentMethod } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatPrice } from '../../lib/format'
import OrderItemActionSheet from './OrderItemActionSheet'

function itemStatusClass(status: string) {
  if (status === 'Ready') return 'text-green-500'
  if (status === 'Preparing') return 'text-blue-500'
  if (status === 'Served') return 'text-tg-hint'
  return 'text-tg-text'
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

  const canEdit = perm.has('EditOrder')
  const canCancel = perm.has('CancelOrder')
  const canMoveItems = perm.has('MoveOrderItems')

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

  // Push updates for THIS order trigger a refetch; events for other orders are ignored.
  useRealtimeEvent<{ orderId: string }>('orderChanged', ({ orderId }) => {
    if (orderId === id) load()
  })

  const handleCancel = async () => {
    if (!order) return
    setActionLoading(true)
    try {
      const updated = await api.orders.cancel(order.id)
      setOrder(updated)
      navigate('/orders', { replace: true })
    } catch {
      // silent — list page will show the latest state on next load
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
      const updated = await api.orders.markPaid(order.id, method)
      setOrder(updated)
      setPaying(false)
      navigate('/orders', { replace: true })
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
        <div className="h-8 w-40 rounded-xl bg-tg-secondary-bg animate-pulse mb-6" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse mb-3" />
        ))}
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="page-enter flex flex-col items-center px-5 pt-16 pb-10 max-w-md mx-auto w-full min-h-full">
        <p className="text-tg-destructive">{error ?? t('orders.errors.loadFailed')}</p>
        <button type="button" onClick={load} className="mt-3 px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
          {t('common.retry')}
        </button>
      </main>
    )
  }

  const isOpen = order.status === 'Open'
  const itemTappable = isOpen && (canMoveItems || canEdit)

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('orders.table')} {order.tableNumber}</h1>
          <span className={`text-sm font-semibold ${
            order.status === 'Open' ? 'text-blue-500' :
            order.status === 'Paid' ? 'text-green-500' : 'text-tg-hint'
          }`}>
            {t(`orders.status.${order.status}`)}
          </span>
        </div>
        <p className="text-tg-hint text-xs mt-1">
          {t('orders.createdBy')} {order.createdBy} · {formatDateTime(order.createdAt)}
        </p>

        {/* Client chip — shows assigned customer + open picker. Only on Open orders. */}
        {isOpen && canEdit && perm.has('ViewClients') && (
          <button
            type="button"
            onClick={() => setPickingClient(true)}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-tg-secondary-bg text-left w-full active:scale-[0.98] transition"
          >
            <span className="text-lg" aria-hidden>👤</span>
            <span className="flex-1 text-sm font-medium text-tg-text truncate">
              {order.clientName ?? t('orders.client.assign')}
            </span>
            <span className="text-tg-hint text-xs">{order.clientName ? t('orders.client.change') : ''}</span>
          </button>
        )}
        {!isOpen && order.clientName && (
          <p className="mt-3 text-sm text-tg-text">
            <span className="mr-1">👤</span>{order.clientName}
          </p>
        )}
      </header>

      {/* items */}
      <div className="flex flex-col gap-2 mb-6">
        {order.items.map(item => (
          <button
            key={item.id}
            type="button"
            disabled={!itemTappable}
            onClick={() => itemTappable && setActionItem(item)}
            className={`w-full flex items-start justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left transition
              ${itemTappable ? 'active:scale-[0.98]' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-tg-text">{item.menuItemName}</p>
              {item.notes && <p className="text-xs text-tg-hint mt-0.5 italic truncate">“{item.notes}”</p>}
              <p className="text-sm text-tg-hint mt-0.5">
                {formatPrice(item.price)} × {item.quantity}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
              <span className={`text-xs font-medium ${itemStatusClass(item.status)}`}>
                {t(`orders.itemStatus.${item.status}`)}
              </span>
              <span className="text-sm font-semibold text-tg-text">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* total */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg mb-6">
        <span className="text-base font-semibold text-tg-text">{t('orders.total')}</span>
        <span className="text-lg font-bold text-tg-text">{formatPrice(order.total)}</span>
      </div>

      {/* actions */}
      {isOpen && (
        <div className="flex flex-col gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/orders/${order.id}/add-items`)}
              className="w-full py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-text font-medium active:scale-[0.98] transition"
            >
              + {t('orders.addItem')}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setPaying(true)}
              className="w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-medium active:scale-[0.98] transition disabled:opacity-60"
            >
              {t('orders.close')}
            </button>
          )}
          {canCancel && !confirmCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="w-full py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
            >
              {t('orders.cancel')}
            </button>
          )}
          {canCancel && confirmCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="w-full py-3.5 rounded-2xl bg-tg-destructive text-white font-medium active:scale-[0.98] transition disabled:opacity-60"
            >
              {t('orders.cancelConfirm')}
            </button>
          )}
        </div>
      )}

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

      {paying && (
        <PaymentMethodSheet
          total={order.items.reduce((s, i) => s + i.price * i.quantity, 0)}
          hasClient={order.clientId !== null}
          busy={actionLoading}
          error={payError}
          onClose={() => { setPaying(false); setPayError(null) }}
          onPick={handlePay}
        />
      )}

      {pickingClient && (
        <ClientPicker
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
      )}
    </main>
  )
}

// ---- Payment method picker ----

interface PaymentSheetProps {
  total: number
  hasClient: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onPick: (method: PaymentMethod) => void
}

function PaymentMethodSheet({ total, hasClient, busy, error, onClose, onPick }: PaymentSheetProps) {
  const { t } = useTranslation()
  // Deposit option only appears when a client is linked to the order — otherwise
  // the server would reject it. Surfacing it conditionally keeps the UI honest.
  const methods: { value: PaymentMethod; icon: string }[] = [
    { value: 'Cash',         icon: '💵' },
    { value: 'Card',         icon: '💳' },
    { value: 'BankTransfer', icon: '🏦' },
    ...(hasClient ? [{ value: 'Deposit' as PaymentMethod, icon: '🪙' }] : []),
    { value: 'Other',        icon: '📝' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">{t('orders.payment.title')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>
        <p className="text-tg-hint text-sm mb-5">
          {t('orders.payment.subtitle')}
          <span className="ml-1 text-tg-text font-semibold">{formatPrice(total)}</span>
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {methods.map(m => (
            <button
              key={m.value}
              type="button"
              disabled={busy}
              onClick={() => onPick(m.value)}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-tg-secondary-bg text-tg-text active:scale-[0.98] transition disabled:opacity-50"
            >
              <span className="text-3xl" aria-hidden>{m.icon}</span>
              <span className="text-sm font-medium">{t(`orders.payment.methods.${m.value}`)}</span>
            </button>
          ))}
        </div>

        {error && <p className="text-tg-destructive text-sm text-center mt-4">{error}</p>}
      </div>
    </div>
  )
}

// ---- Client picker ----

interface ClientPickerProps {
  currentClientId: string | null
  onClose: () => void
  onPick: (clientId: string | null) => void
}

function ClientPicker({ currentClientId, onClose, onPick }: ClientPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true)
      api.clients.getAll(search ? { search } : undefined)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t('orders.client.title')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>

        <input
          type="search"
          autoFocus
          placeholder={t('clients.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-tg-button transition mb-3"
        />

        {currentClientId && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="w-full mb-3 py-3 rounded-xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
          >
            × {t('orders.client.unassign')}
          </button>
        )}

        <div className="overflow-y-auto flex flex-col gap-2">
          {loading ? (
            <p className="text-tg-hint text-sm text-center py-4">{t('common.loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-tg-hint text-sm text-center py-4">{t('clients.empty')}</p>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.fullName}</p>
                <p className="text-[11px] text-tg-hint mt-0.5 truncate">{c.phone ?? t('clients.noPhone')}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${c.depositBalance < 0 ? 'text-tg-destructive' : 'text-tg-text'}`}>
                {formatPrice(c.depositBalance)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
