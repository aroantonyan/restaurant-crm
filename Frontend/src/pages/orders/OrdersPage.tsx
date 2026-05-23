import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type OrderDto } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatPrice } from '../../lib/format'

type Filter = 'all' | 'Open' | 'Paid' | 'Cancelled'

function statusClass(status: string) {
  if (status === 'Open') return 'text-blue-500'
  if (status === 'Paid') return 'text-green-500'
  return 'text-tg-hint'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

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

  // Any order change anywhere in the restaurant → refresh the list.
  useRealtimeEvent('orderChanged', () => { load() })

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: t('orders.filter.all') },
    { key: 'Open', label: t('orders.filter.open') },
    { key: 'Paid', label: t('orders.filter.paid') },
    { key: 'Cancelled', label: t('orders.filter.cancelled') },
  ]

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/orders/new')}
            className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm active:scale-[0.98] transition"
          >
            + {t('orders.new')}
          </button>
        )}
      </header>

      {/* filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition active:scale-[0.98]
              ${filter === f.key ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center">
          <p className="text-tg-destructive">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm"
          >
            {t('common.submit')}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center mt-16 text-center">
          <p className="text-tg-hint">{t('orders.noOrders')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map(order => (
            <button
              key={order.id}
              type="button"
              onClick={() => navigate(`/orders/${order.id}`)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
            >
              <div>
                <p className="text-base font-medium text-tg-text">
                  {t('orders.table')} {order.tableNumber}
                </p>
                <p className="text-xs text-tg-hint mt-0.5">
                  {t('orders.createdBy')} {order.createdBy} · {formatTime(order.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-sm font-semibold ${statusClass(order.status)}`}>
                  {t(`orders.status.${order.status}`)}
                </span>
                <span className="text-sm text-tg-text">{formatPrice(order.total)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
