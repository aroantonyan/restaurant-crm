import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  api,
  ApiError,
  type ClientDto,
  type ClientTransactionDto,
  type ClientTransactionType,
} from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { getTelegram } from '../../lib/telegram'
import { formatPrice } from '../../lib/format'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'
import Portal from '../../components/Portal'

const TX_STYLES: Record<ClientTransactionType, { dot: string; text: string }> = {
  Deposit:        { dot: 'bg-ok',          text: 'text-ok'         },
  Withdrawal:     { dot: 'bg-warn',         text: 'text-warn'       },
  OrderPayment:   { dot: 'bg-info',         text: 'text-info'       },
  CashbackEarned: { dot: 'bg-[#9A4E96]',   text: 'text-[#9A4E96]' },
}

type DialogMode = 'deposit' | 'withdraw' | null

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/clients')

  const canManage = perm.has('ManageClients')

  const [client, setClient] = useState<ClientDto | null>(null)
  const [transactions, setTransactions] = useState<ClientTransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [archiving, setArchiving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [c, txs] = await Promise.all([api.clients.getById(id), api.clients.getTransactions(id, 50)])
      setClient(c)
      setTransactions(txs)
    } catch {
      setError(t('clients.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleArchive = async () => {
    if (!client) return
    setArchiving(true)
    try {
      await api.clients.archive(client.id)
      navigate('/clients')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('clients.errors.saveFailed'))
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <main className="page-enter px-5 pt-4 pb-10 max-w-md mx-auto w-full">
        <div className="h-7 w-40 bg-card rounded animate-pulse mb-3" />
        <div className="h-24 rounded-2xl bg-card animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-card animate-pulse" />)}
        </div>
      </main>
    )
  }

  if (error || !client) {
    return (
      <main className="page-enter px-5 pt-4 pb-10 max-w-md mx-auto w-full text-center">
        <p className="text-danger text-sm">{error ?? t('clients.errors.loadFailed')}</p>
        <button type="button" onClick={load} className="mt-3 px-4 py-2 rounded-xl bg-card text-fg-3 text-sm">
          {t('common.retry')}
        </button>
      </main>
    )
  }

  const negative = client.depositBalance < 0

  return (
    <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{client.fullName}</h1>
          <p className="text-fg-3 text-sm mt-0.5 truncate">
            {client.phone ?? t('clients.noPhone')}
            {client.email && <span> · {client.email}</span>}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}/edit`)}
            className="text-accent text-sm font-medium shrink-0 active:opacity-60 transition"
          >
            {t('clients.edit')}
          </button>
        )}
      </header>

      {/* Balance hero card */}
      <div className="rounded-2xl bg-card px-5 py-4 mb-3">
        <p className="text-[11px] text-fg-3 uppercase tracking-wide font-medium">{t('clients.balance')}</p>
        <p className={`text-3xl font-bold mt-1 tabular-nums ${negative ? 'text-danger' : 'text-fg'}`}>
          {formatPrice(client.depositBalance)}
        </p>
        <p className="text-xs text-fg-3 mt-1">
          {negative ? t('clients.balanceOwed') : t('clients.balanceCredit')}
        </p>
        {client.loyaltyType === 'Cashback' && client.loyaltyRate > 0 && (
          <p className="text-xs text-fg mt-2">
            🎁 {client.loyaltyRate}% {t('clients.cashbackOn')}
          </p>
        )}
      </div>

      {canManage && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button type="button" onClick={() => setDialog('deposit')} className="py-3 rounded-xl bg-accent text-white font-semibold active:scale-[0.98] transition">
            + {t('clients.deposit')}
          </button>
          <button type="button" onClick={() => setDialog('withdraw')} disabled={client.depositBalance <= 0} className="py-3 rounded-xl bg-card text-fg font-semibold active:scale-[0.98] transition disabled:opacity-40">
            – {t('clients.withdraw')}
          </button>
        </div>
      )}

      {client.notes && (
        <div className="px-4 py-3 rounded-2xl bg-card mb-4">
          <p className="text-[11px] text-fg-3 uppercase tracking-wide mb-1">{t('clients.fields.notes')}</p>
          <p className="text-sm text-fg">{client.notes}</p>
        </div>
      )}

      <h2 className="text-xs text-fg-3 uppercase tracking-wider font-medium mb-2 px-1">{t('clients.history')}</h2>
      {transactions.length === 0 ? (
        <p className="text-sm text-fg-3 px-1">{t('clients.noTransactions')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.map(tx => {
            const style = TX_STYLES[tx.type]
            const positive = tx.amount > 0
            return (
              <li key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <span className={style.text}>{t(`clients.txType.${tx.type}`)}</span>
                  </p>
                  <p className="text-[11px] text-fg-3 mt-0.5 truncate">
                    {new Date(tx.createdAt).toLocaleString()}
                    {tx.reason && <span> · {tx.reason}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold tabular-nums ${positive ? 'text-ok' : 'text-danger'}`}>
                    {positive ? '+' : ''}{formatPrice(tx.amount)}
                  </p>
                  <p className="text-[11px] text-fg-3 tabular-nums">→ {formatPrice(tx.balanceAfter)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {canManage && (
        <div className="mt-8 pt-5 border-t border-line">
          {!confirmArchive ? (
            <button type="button" onClick={() => setConfirmArchive(true)} className="w-full py-3 rounded-xl text-danger text-sm font-medium active:bg-card transition">
              {t('clients.archive')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-fg-3 text-center">{t('clients.archiveHint')}</p>
              <button type="button" onClick={handleArchive} disabled={archiving} className="w-full py-3 rounded-xl bg-danger/10 text-danger font-semibold active:scale-[0.98] transition disabled:opacity-50">
                {archiving ? t('common.loading') : t('clients.archiveConfirm')}
              </button>
              <button type="button" onClick={() => setConfirmArchive(false)} className="w-full py-2.5 rounded-xl bg-card text-fg-3 text-sm">
                {t('clients.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {dialog && (
        <BalanceOpModal
          client={client}
          mode={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load() }}
        />
      )}
    </main>
  )
}

// ---- Deposit / Withdraw modal ----

interface BalanceOpProps {
  client: ClientDto
  mode: 'deposit' | 'withdraw'
  onClose: () => void
  onSaved: () => void
}

function BalanceOpModal({ client, mode, onClose, onSaved }: BalanceOpProps) {
  const { t } = useTranslation()
  const [method, setMethod] = useState<'Cash' | 'Card' | 'BankTransfer'>('Cash')
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    amount: z.number({ error: t('auth.errors.required') }).positive({ error: t('clients.errors.positive') }),
    reason: z.string().max(500, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const payload = { amount: data.amount, method, reason: data.reason || null }
      if (mode === 'deposit') await api.clients.deposit(client.id, payload)
      else                    await api.clients.withdraw(client.id, payload)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('clients.errors.saveFailed'))
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-in" onClick={onClose}>
      <div
        className="bg-bg rounded-t-3xl px-5 pt-6 sheet-in"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'calc(40px + var(--keyboard-offset, 0px))' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">
            {mode === 'deposit' ? t('clients.deposit') : t('clients.withdraw')}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-fg-3 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['Cash', 'Card', 'BankTransfer'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={[
                'py-2.5 rounded-xl text-xs font-semibold transition',
                method === m ? 'bg-accent text-white' : 'bg-card text-fg-3',
              ].join(' ')}
            >
              {t(`orders.payment.methods.${m}`)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={t('clients.amount')}
            type="number"
            inputMode="decimal"
            step="0.01"
            enterKeyHint="next"
            autoFocus
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />
          <Field
            label={t('clients.fields.reason')}
            enterKeyHint="done"
            {...register('reason')}
            error={errors.reason?.message}
          />
          {serverError && <p className="text-danger text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>
            {mode === 'deposit' ? t('clients.deposit') : t('clients.withdraw')}
          </SubmitButton>
        </form>
      </div>
    </div>
    </Portal>
  )
}
