import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Banknote, CreditCard, Landmark, MoreHorizontal } from 'lucide-react'
import { api, ApiError, type BillPreviewDto, type OrderDto, type OrderItemDto, type PaymentMethod } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatPrice } from '../../lib/format'
import AppHeader from '../../components/AppHeader'
import StatusPill from '../../components/StatusPill'
import StickyActions from '../../components/StickyActions'
import PrimaryButton from '../../components/PrimaryButton'
import Sheet from '../../components/Sheet'
import ClientPickerSheet from '../../components/ClientPickerSheet'
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

const PAYMENT_ICONS: Record<string, string> = {
  Cash: '💵', Card: '💳', BankTransfer: '🏦', Deposit: '🪙', Other: '📝',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()

  const [order, setOrder] = useState<OrderDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionItem, setActionItem] = useState<OrderItemDto | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [bill, setBill] = useState<BillPreviewDto | null>(null)
  const [billLoading, setBillLoading] = useState(false)
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

  const openPayment = async () => {
    if (!order) return
    setPaying(true)
    setPayError(null)
    setBill(null)
    setBillLoading(true)
    try {
      setBill(await api.orders.getBill(order.id))
    } catch {
      // Bill preview is best-effort; the sheet still works with the raw total.
    } finally {
      setBillLoading(false)
    }
  }

  const handlePay = async (method: PaymentMethod, opts: { useDeposit: boolean; applyCashback: boolean }) => {
    if (!order) return
    setPayError(null)
    setActionLoading(true)
    try {
      await api.orders.markPaid(order.id, method, opts)
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
        {!isOpen && (order.clientName || order.paymentMethod) && (
          <div className="px-5 pb-3 flex flex-col gap-2">
            {order.clientName && (
              <p className="m-0 text-sm text-fg-2">
                <span className="mr-1.5" aria-hidden>👤</span>
                {order.clientName}
              </p>
            )}
            {order.status === 'Paid' && order.paymentMethod && (
              <div
                className="flex items-center gap-2.5 py-2.5 px-3.5 bg-ok-soft rounded-2xl"
              >
                <span className="text-base" aria-hidden>{PAYMENT_ICONS[order.paymentMethod] ?? '✓'}</span>
                <span className="text-sm font-semibold text-ok">
                  {t('orders.paidVia', { method: t(`orders.payment.methods.${order.paymentMethod}`) })}
                </span>
              </div>
            )}
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
                onClick={() => navigate(`/orders/${order.id}/add-items`, { state: { tableNumber: order.tableNumber } })}
                icon={<PlusIconSmall />}
              >
                {t('orders.addAction')}
              </PrimaryButton>
            )}
            {canEdit && (
              <PrimaryButton
                kind="primary"
                disabled={actionLoading}
                onClick={openPayment}
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
        bill={bill}
        billLoading={billLoading}
        busy={actionLoading}
        error={payError}
        onClose={() => { setPaying(false); setPayError(null) }}
        onPick={handlePay}
      />

      {/* Client picker sheet */}
      <ClientPickerSheet
        open={pickingClient}
        currentClientId={order.clientId}
        onClose={() => setPickingClient(false)}
        onPick={async client => {
          try {
            const updated = await api.orders.assignClient(order.id, client?.id ?? null)
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
  bill: BillPreviewDto | null
  billLoading: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onPick: (method: PaymentMethod, opts: { useDeposit: boolean; applyCashback: boolean }) => void
}

const METHOD_ICONS: Record<Exclude<PaymentMethod, 'Deposit'>, typeof Banknote> = {
  Cash:         Banknote,
  Card:         CreditCard,
  BankTransfer: Landmark,
  Other:        MoreHorizontal,
}

/**
 * Close-the-bill sheet. The customer's store-credit balance and loyalty cashback
 * are NEVER applied automatically — the cashier opts into each with a checkbox and
 * sees the charge update live before picking how the remainder is settled.
 *
 *   subtotal − (balance, if ticked) = amount to charge
 *   cashback (if ticked) is earned on that out-of-pocket amount and credited back
 */
function PaymentMethodSheet({ open, total, bill, billLoading, busy, error, onClose, onPick }: PaymentSheetProps) {
  const { t } = useTranslation()

  const [useBalance, setUseBalance] = useState(false)
  const [giveCashback, setGiveCashback] = useState(false)

  // Reset the toggles every time the sheet re-opens — opting in is a per-bill decision.
  useEffect(() => {
    if (open) { setUseBalance(false); setGiveCashback(false) }
  }, [open])

  const rawBalance     = bill?.clientDepositBalance ?? 0
  const balanceAvail   = Math.max(rawBalance, 0)
  const hasBalance     = balanceAvail > 0
  const isCashbackTier = bill !== null && bill.loyaltyType === 'Cashback' && bill.loyaltyRate > 0
  const rate           = bill?.loyaltyRate ?? 0
  // VIP table surcharge — a flat amount added on top of the items. The bill total
  // the customer actually owes is items + VIP.
  const vipSurcharge   = bill?.vipSurcharge ?? 0
  const billTotal      = total + vipSurcharge

  const { balanceApplied, toCharge, cashbackEarned, newBalance } = useMemo(() => {
    const applied = useBalance ? Math.min(balanceAvail, billTotal) : 0
    const charge  = billTotal - applied
    const cb      = giveCashback ? Math.round(charge * (rate / 100)) : 0
    return {
      balanceApplied: applied,
      toCharge:       charge,
      cashbackEarned: cb,
      newBalance:     rawBalance - applied + cb,
    }
  }, [useBalance, giveCashback, balanceAvail, billTotal, rate, rawBalance])

  const methods: PaymentMethod[] = ['Cash', 'Card', 'BankTransfer', 'Other']
  const fullyCovered = toCharge === 0 && balanceApplied > 0
  const optsForPick = { useDeposit: useBalance, applyCashback: giveCashback }

  return (
    <Sheet open={open} onClose={onClose} title={t('orders.payment.title')}>
      {/* Live breakdown — updates as the toggles below change. */}
      <div className="mb-3.5 rounded-[18px] bg-bg p-3.5 flex flex-col gap-2">
        <Row label={t('orders.bill.subtotal')} value={formatPrice(total)} />

        {vipSurcharge > 0 && (
          <Row label={t('orders.bill.vipSurcharge')} value={`+${formatPrice(vipSurcharge)}`} />
        )}

        {balanceApplied > 0 && (
          <Row label={t('orders.bill.balanceApplied')} value={`−${formatPrice(balanceApplied)}`} tone="ok" />
        )}

        <div className="h-px bg-line my-0.5" />
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-fg">{t('orders.bill.toCharge')}</span>
          <span className="text-[18px] font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.01em' }}>
            {formatPrice(toCharge)}
          </span>
        </div>

        {cashbackEarned > 0 && (
          <Row label={t('orders.bill.cashbackEarned')} value={`+${formatPrice(cashbackEarned)}`} tone="ok" />
        )}
        {(useBalance || giveCashback) && bill?.clientId && (
          <Row
            label={t('orders.bill.newBalance')}
            value={formatPrice(newBalance)}
            tone={newBalance < 0 ? 'danger' : 'muted'}
          />
        )}

        {billLoading && <p className="m-0 text-xs text-fg-3">{t('common.loading')}</p>}
      </div>

      {/* Opt-in toggles — only shown when the attached client actually has the perk. */}
      {(hasBalance || isCashbackTier) && (
        <div className="mb-3.5 flex flex-col gap-2">
          {hasBalance && (
            <CheckRow
              checked={useBalance}
              onToggle={() => setUseBalance(v => !v)}
              title={t('orders.bill.useBalance')}
              sub={t('orders.bill.available', { amount: formatPrice(balanceAvail) })}
            />
          )}
          {isCashbackTier && (
            <CheckRow
              checked={giveCashback}
              onToggle={() => setGiveCashback(v => !v)}
              title={t('orders.bill.giveCashback', { rate })}
            />
          )}
        </div>
      )}

      {fullyCovered ? (
        // Balance covers the whole bill — no external payment, just confirm.
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick('Cash', optsForPick)}
          className="tappable w-full border-0 bg-accent text-white rounded-2xl py-3.5 font-semibold disabled:opacity-50"
        >
          {t('orders.bill.fullyCovered')}
        </button>
      ) : (
        <>
          <p className="m-0 mb-2.5 text-[12px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
            {t('orders.payment.howPaid')}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {methods.map(m => {
              const Icon = METHOD_ICONS[m as Exclude<PaymentMethod, 'Deposit'>]
              return (
                <button
                  key={m}
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(m, optsForPick)}
                  className="tappable border-0 bg-bg rounded-[18px] py-4 px-3 flex flex-col items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="text-accent" aria-hidden><Icon size={24} strokeWidth={2} /></span>
                  <span className="text-[13px] font-semibold text-fg-2">
                    {t(`orders.payment.methods.${m}`)}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums text-accent-press">
                    {formatPrice(toCharge)}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <p className="m-0 mt-4 text-sm text-danger text-center">{error}</p>}
    </Sheet>
  )
}

function Row({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'ok' | 'danger' | 'muted' }) {
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-danger' : 'text-fg-2'
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-fg-3">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  )
}

function CheckRow({ checked, onToggle, title, sub }: { checked: boolean; onToggle: () => void; title: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`tappable w-full border rounded-2xl py-3 px-3.5 flex items-center gap-3 text-left transition-colors
        ${checked ? 'border-accent bg-accent-soft' : 'border-line bg-bg'}`}
    >
      <span
        className={`w-[22px] h-[22px] rounded-[7px] flex items-center justify-center shrink-0 transition-colors
          ${checked ? 'bg-accent text-white' : 'bg-card border border-line-strong'}`}
      >
        {checked && <Check size={15} strokeWidth={3} aria-hidden />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-fg">{title}</span>
        {sub && <span className="block text-[12px] text-fg-3 tabular-nums">{sub}</span>}
      </span>
    </button>
  )
}
