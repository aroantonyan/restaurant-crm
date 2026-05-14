import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type OrderDto, type OrderItemDto, type MenuCategoryDto } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'

const ITEM_STATUS_CYCLE: Record<string, string> = {
  Pending: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Served',
  Served: 'Served',
}

function itemStatusClass(status: string) {
  if (status === 'Ready') return 'text-green-500'
  if (status === 'Preparing') return 'text-blue-500'
  if (status === 'Served') return 'text-tg-hint'
  return 'text-tg-text'
}

// ---- Add item modal ----

interface AddItemModalProps {
  orderId: string
  categories: MenuCategoryDto[]
  onClose: () => void
  onAdded: (updated: OrderDto) => void
}

function AddItemModal({ orderId, categories, onClose, onAdded }: AddItemModalProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const allItems = categories.flatMap(c => c.items.filter(i => i.isAvailable))

  const schema = z.object({
    menuItemId: z.string().min(1, { error: t('auth.errors.required') }),
    quantity: z.number({ error: t('auth.errors.required') }).int().min(1),
    notes: z.string().optional(),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { menuItemId: allItems[0]?.id ?? '', quantity: 1, notes: '' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const updated = await api.orders.addItem(orderId, {
        menuItemId: data.menuItemId,
        quantity: data.quantity,
        notes: data.notes || undefined,
      })
      onAdded(updated)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('orders.addItem')}</h2>
          <button type="button" onClick={onClose} className="text-tg-hint text-2xl leading-none px-2">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select
            label={t('menu.itemName')}
            options={allItems.map(i => ({ value: i.id, label: `${i.categoryName} — ${i.name} (${i.price.toFixed(2)})` }))}
            {...register('menuItemId')}
            error={errors.menuItemId?.message}
          />
          <Field
            label={t('orders.quantity')}
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            min="1"
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />
          <Field
            label={t('orders.notes')}
            enterKeyHint="done"
            {...register('notes')}
            error={errors.notes?.message}
          />
          {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>{t('orders.addItem')}</SubmitButton>
        </form>
      </div>
    </div>
  )
}

// ---- Main page ----

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton()

  const [order, setOrder] = useState<OrderDto | null>(null)
  const [categories, setCategories] = useState<MenuCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const canEdit = perm.has('EditOrder')
  const canCancel = perm.has('CancelOrder')
  const canMoveItems = perm.has('MoveOrderItems')

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [ord, cats] = await Promise.all([
        api.orders.getById(id),
        api.menu.getAll(),
      ])
      setOrder(ord)
      setCategories(cats)
    } catch {
      setError(t('orders.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!order) return
    setActionLoading(true)
    try {
      const updated = await api.orders.updateStatus(order.id, status)
      setOrder(updated)
      if (status === 'Paid' || status === 'Cancelled') navigate('/orders', { replace: true })
    } catch {
      // silent
    } finally {
      setActionLoading(false)
      setConfirmCancel(false)
    }
  }

  const handleItemStatusCycle = async (item: OrderItemDto) => {
    if (!order || !canMoveItems) return
    const next = ITEM_STATUS_CYCLE[item.status]
    if (next === item.status) return
    try {
      const updated = await api.orders.updateItemStatus(order.id, item.id, next)
      setOrder(updated)
    } catch {
      // silent
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
          {t('common.submit')}
        </button>
      </main>
    )
  }

  const isOpen = order.status === 'Open'

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
      </header>

      {/* items */}
      <div className="flex flex-col gap-2 mb-6">
        {order.items.map(item => (
          <button
            key={item.id}
            type="button"
            disabled={!canMoveItems || !isOpen}
            onClick={() => handleItemStatusCycle(item)}
            className={`w-full flex items-start justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left transition
              ${canMoveItems && isOpen ? 'active:scale-[0.98]' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-tg-text">{item.menuItemName}</p>
              {item.notes && <p className="text-xs text-tg-hint mt-0.5 truncate">{item.notes}</p>}
              <p className="text-sm text-tg-hint mt-0.5">
                {item.price.toFixed(2)} × {item.quantity}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
              <span className={`text-xs font-medium ${itemStatusClass(item.status)}`}>
                {t(`orders.itemStatus.${item.status}`)}
              </span>
              <span className="text-sm font-semibold text-tg-text">
                {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* total */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg mb-6">
        <span className="text-base font-semibold text-tg-text">{t('orders.total')}</span>
        <span className="text-lg font-bold text-tg-text">{order.total.toFixed(2)}</span>
      </div>

      {/* actions */}
      {isOpen && (
        <div className="flex flex-col gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddItem(true)}
              className="w-full py-3.5 rounded-2xl bg-tg-secondary-bg text-tg-text font-medium active:scale-[0.98] transition"
            >
              + {t('orders.addItem')}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleStatusUpdate('Paid')}
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
              onClick={() => handleStatusUpdate('Cancelled')}
              className="w-full py-3.5 rounded-2xl bg-tg-destructive text-white font-medium active:scale-[0.98] transition disabled:opacity-60"
            >
              {t('orders.cancelConfirm')}
            </button>
          )}
        </div>
      )}

      {showAddItem && (
        <AddItemModal
          orderId={order.id}
          categories={categories}
          onClose={() => setShowAddItem(false)}
          onAdded={updated => { setOrder(updated); setShowAddItem(false) }}
        />
      )}
    </main>
  )
}
