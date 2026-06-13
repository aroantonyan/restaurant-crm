import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuItemDto } from '../../../lib/api'
import { usePermissions } from '../../../hooks/usePermissions'
import { useOrderDraft, type OrderDraftItem } from './OrderDraftContext'
import { formatPrice } from '../../../lib/format'
import StickyActions from '../../../components/StickyActions'
import PrimaryButton from '../../../components/PrimaryButton'
import ClientPickerSheet from '../../../components/ClientPickerSheet'
import StepHeader from './StepHeader'
import ItemAddModal from './ItemAddModal'

export default function OrderReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const draft = useOrderDraft()
  const perm = usePermissions()

  const addMode = !!id
  const menuRoute = addMode ? `/orders/${id}/add-items` : '/orders/new/menu'

  useEffect(() => {
    if (!addMode && !draft.table) navigate('/orders/new', { replace: true })
  }, [draft.table, addMode, navigate])

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [editing, setEditing] = useState<OrderDraftItem | null>(null)
  const [pickingClient, setPickingClient] = useState(false)
  const [cancelArmed, setCancelArmed] = useState(false)

  const canAssignClient = !addMode && perm.has('ViewClients')

  // Abandon the in-progress order: return home. Nothing is persisted yet on the
  // new-order path, and on add-items it just discards the pending additions (the
  // existing order is untouched). Leaving unmounts CreateOrderLayout, which drops
  // the draft provider — so we navigate without clear() to avoid racing the
  // "no table → bounce to step 1" effect. Two-tap confirm guards a stray touch.
  const handleCancel = () => {
    if (!cancelArmed) {
      setCancelArmed(true)
      return
    }
    navigate('/dashboard')
  }

  const handleSubmit = async () => {
    if (draft.items.length === 0) return
    setSubmitting(true)
    setServerError(null)
    try {
      if (addMode && id) {
        for (const item of draft.items) {
          await api.orders.addItem(id, {
            menuItemId: item.menuItemId,
            quantity:   item.quantity,
            notes:      item.notes,
          })
        }
        draft.clear()
        navigate(`/orders/${id}`, { replace: true })
      } else if (draft.table) {
        const order = await api.orders.create({
          tableId:  draft.table.id,
          clientId: draft.client?.id ?? null,
          items:    draft.items.map(i => ({
            menuItemId: i.menuItemId,
            quantity:   i.quantity,
            notes:      i.notes,
          })),
        })
        draft.clear()
        navigate(`/orders/${order.id}`, { replace: true })
      }
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
      setSubmitting(false)
    }
  }

  if (!addMode && !draft.table) return null

  const subtitle = addMode ? t('orders.reviewBeforeAdding') : t('orders.step.review')

  const totalItemsCount = draft.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="relative h-full overflow-hidden">
      <main className="page-enter h-full overflow-y-auto pb-[220px]">
        <StepHeader
          step={addMode ? 2 : 3}
          addMode={addMode}
          subtitle={subtitle}
          backTo={menuRoute}
          tableNumber={draft.tableNumber ?? undefined}
        />

        {/* Assign a customer before the order goes to the kitchen, so loyalty /
            deposit billing is ready at close. Only on the new-order path. */}
        {canAssignClient && draft.items.length > 0 && (
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
              <span className={`flex-1 text-sm font-medium truncate ${draft.client ? 'text-fg' : 'text-fg-3'}`}>
                {draft.client?.fullName ?? t('orders.client.assign')}
              </span>
              <span className="text-xs text-fg-3 shrink-0">
                {draft.client ? t('orders.client.change') : ''}
              </span>
            </button>
          </div>
        )}

        <div className="px-5">
          {draft.items.length === 0 ? (
            <div className="flex flex-col items-center text-center pt-12 px-4 gap-3">
              <div className="text-[40px]" aria-hidden>🛒</div>
              <p className="m-0 text-base font-semibold text-fg">{t('orders.cartEmpty')}</p>
              <button
                type="button"
                onClick={() => navigate(menuRoute)}
                className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold tappable border-0"
              >
                {t('orders.addItem')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {draft.items.map((item, idx) => (
                  <button
                    key={item.menuItemId}
                    type="button"
                    onClick={() => setEditing(item)}
                    className="tappable item-enter w-full text-left bg-card border-0 rounded-[18px] py-3 px-3.5 flex items-start gap-3"
                    style={{
                      animationDelay: `${idx * 30}ms`,
                      boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-[15px] font-semibold truncate"
                         style={{ letterSpacing: '-0.005em' }}>
                        {item.name}
                      </p>
                      <p className="m-0 mt-0.5 text-[12.5px] text-fg-3">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                      {item.notes && (
                        <p className="m-0 mt-1 text-xs text-accent-press italic truncate">
                          “{item.notes}”
                        </p>
                      )}
                    </div>
                    <span className="text-[15px] font-bold tabular-nums shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(menuRoute)}
                className="mt-3 px-3.5 py-2.5 rounded-xl bg-accent-soft text-accent-press text-sm font-semibold tappable border-0 inline-flex items-center gap-1.5"
              >
                <PlusIconSmall />
                {t('orders.step.addMore')}
              </button>
            </>
          )}
        </div>
      </main>

      {/* Sticky bottom confirm bar */}
      {draft.items.length > 0 && (
        <StickyActions
          hint={
            <>
              {t('orders.total')} ·{' '}
              <strong className="text-fg-2 tabular-nums">{t('orders.items', { count: totalItemsCount })}</strong>
            </>
          }
        >
          {serverError && (
            <p className="m-0 -mt-1 text-sm text-danger text-center">{serverError}</p>
          )}
          <div className="flex items-center justify-between gap-3 mb-1 px-1">
            <span className="text-xs text-fg-3 uppercase font-bold" style={{ letterSpacing: '0.06em' }}>
              {t('orders.total')}
            </span>
            <span className="text-[22px] font-bold tabular-nums" style={{ letterSpacing: '-0.02em' }}>
              {formatPrice(draft.total)}
            </span>
          </div>
          <PrimaryButton
            kind="primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? t('common.loading')
              : addMode
                ? t('orders.addToOrder')
                : t('orders.kitchen.title')}
          </PrimaryButton>
          <PrimaryButton
            kind={cancelArmed ? 'danger' : 'dangerSoft'}
            disabled={submitting}
            onClick={handleCancel}
          >
            {cancelArmed ? t('orders.cancelOrderConfirm') : t('orders.cancelOrder')}
          </PrimaryButton>
        </StickyActions>
      )}

      <ClientPickerSheet
        open={pickingClient}
        currentClientId={draft.client?.id ?? null}
        onClose={() => setPickingClient(false)}
        onPick={client => {
          draft.setClient(client)
          setPickingClient(false)
        }}
      />

      {editing && (
        <ItemAddModal
          item={{
            id:           editing.menuItemId,
            name:         editing.name,
            price:        editing.price,
            categoryId:   '',
            categoryName: '',
            description:  null,
            photoUrl:     null,
            isAvailable:  true,
          } as MenuItemDto}
          initial={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function PlusIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
