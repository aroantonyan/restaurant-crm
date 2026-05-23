import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  api,
  ApiError,
  type CashRegisterSummaryDto,
  type CashRegisterTransactionDto,
  type CashTransactionType,
} from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'
import { getTelegram } from '../lib/telegram'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'

type RangeKey = 'today' | 'yesterday' | '7d' | '30d'

interface Range { from: Date; to: Date }

function rangeFor(key: RangeKey): Range {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today': {
      const tomorrow = new Date(startOfToday); tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: startOfToday, to: tomorrow }
    }
    case 'yesterday': {
      const yest = new Date(startOfToday); yest.setDate(yest.getDate() - 1)
      return { from: yest, to: startOfToday }
    }
    case '7d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 6)
      const tomorrow = new Date(startOfToday); tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: s, to: tomorrow }
    }
    case '30d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 29)
      const tomorrow = new Date(startOfToday); tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: s, to: tomorrow }
    }
  }
}

const TYPE_STYLES: Record<CashTransactionType, { dot: string; text: string }> = {
  OrderPayment:  { dot: 'bg-green-500',  text: 'text-green-600'  },
  Refund:        { dot: 'bg-red-500',    text: 'text-red-600'    },
  ManualIncome:  { dot: 'bg-blue-500',   text: 'text-blue-600'   },
  ManualExpense: { dot: 'bg-amber-500',  text: 'text-amber-600'  },
}

export default function CashRegisterPage() {
  const { t } = useTranslation()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const canView = perm.has('ViewCashRegister')
  const canManage = perm.has('ManageCashRegister')

  const [rangeKey, setRangeKey] = useState<RangeKey>('today')
  const [summary, setSummary] = useState<CashRegisterSummaryDto | null>(null)
  const [transactions, setTransactions] = useState<CashRegisterTransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, txs] = await Promise.all([
        api.cashRegister.summary(fromIso, toIso),
        api.cashRegister.transactions({ from: fromIso, to: toIso, limit: 100 }),
      ])
      setSummary(s)
      setTransactions(txs)
    } catch {
      setError(t('cash.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [fromIso, toIso, t])

  useEffect(() => { load() }, [load])

  // A teammate's order payment or manual op should refresh this page live.
  useRealtimeEvent('orderChanged', load)

  if (!canView) return <Navigate to="/dashboard" replace />

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t('cash.title')}</h1>
        <p className="text-tg-hint text-sm mt-1">{t('cash.subtitle')}</p>
      </header>

      {/* Range chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        {(['today', 'yesterday', '7d', '30d'] as RangeKey[]).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setRangeKey(k)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition',
              rangeKey === k ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
            ].join(' ')}
          >
            {t(`reports.range.${k}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-tg-destructive text-sm">{error}</p>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
            {t('common.retry')}
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Cash balance — hero card */}
          <div className="rounded-2xl bg-tg-secondary-bg px-5 py-4 mb-3">
            <p className="text-[11px] text-tg-hint uppercase tracking-wide font-medium">{t('cash.balance')}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">
              {loading ? '—' : formatPrice(summary?.cashBalance ?? 0)}
            </p>
            <p className="text-xs text-tg-hint mt-1">{t('cash.balanceHint')}</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <Kpi label={t('cash.kpi.cashIn')}    value={loading ? '—' : formatPrice(summary?.incomeCash ?? 0)} />
            <Kpi label={t('cash.kpi.cardIn')}    value={loading ? '—' : formatPrice(summary?.incomeCard ?? 0)} />
            <Kpi label={t('cash.kpi.manualIn')}  value={loading ? '—' : formatPrice(summary?.manualIncome ?? 0)} />
            <Kpi label={t('cash.kpi.manualOut')} value={loading ? '—' : formatPrice(Math.abs(summary?.manualExpense ?? 0))} />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="w-full py-3 mb-5 rounded-xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition"
            >
              + {t('cash.recordOp')}
            </button>
          )}

          {/* Transactions list */}
          <h2 className="text-xs text-tg-hint uppercase tracking-wider font-medium mb-2 px-1">
            {t('cash.history')}
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-tg-secondary-bg animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-tg-hint px-1">{t('cash.noTransactions')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {transactions.map(tx => {
                const style = TYPE_STYLES[tx.type]
                const positive = tx.amount > 0
                return (
                  <li key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className={style.text}>{t(`cash.txType.${tx.type}`)}</span>
                        <span className="text-tg-hint"> · {t(`cash.method.${tx.method}`)}</span>
                      </p>
                      <p className="text-[11px] text-tg-hint mt-0.5 truncate">
                        {new Date(tx.createdAt).toLocaleString()}
                        {tx.reason && <span> · {tx.reason}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${positive ? 'text-green-600' : 'text-tg-destructive'}`}>
                        {positive ? '+' : ''}{formatPrice(tx.amount)}
                      </p>
                      {tx.method === 'Cash' && (
                        <p className="text-[11px] text-tg-hint tabular-nums">→ {formatPrice(tx.balanceAfter)}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {manualOpen && (
        <ManualOpModal
          onClose={() => setManualOpen(false)}
          onSaved={() => { setManualOpen(false); load() }}
        />
      )}
    </main>
  )
}

// ---- Subcomponents ----

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-2xl bg-tg-secondary-bg">
      <p className="text-[11px] text-tg-hint uppercase tracking-wide font-medium">{label}</p>
      <p className="text-lg font-bold mt-1 truncate tabular-nums">{value}</p>
    </div>
  )
}

interface ManualOpProps {
  onClose: () => void
  onSaved: () => void
}

function ManualOpModal({ onClose, onSaved }: ManualOpProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<'ManualIncome' | 'ManualExpense'>('ManualIncome')
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    amount: z.number({ error: t('auth.errors.required') }).positive({ error: t('cash.errors.positive') }),
    reason: z.string().min(1, { error: t('cash.errors.reasonRequired') }).max(500, { error: t('auth.errors.tooLong') }),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.cashRegister.recordManual({ type, amount: data.amount, reason: data.reason })
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('cash.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t('cash.recordOp')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>

        {/* Income / Expense toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['ManualIncome', 'ManualExpense'] as const).map(t2 => {
            const active = type === t2
            return (
              <button
                key={t2}
                type="button"
                onClick={() => setType(t2)}
                className={[
                  'py-3 rounded-xl text-sm font-semibold transition',
                  active ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
                ].join(' ')}
              >
                {t(`cash.txType.${t2}`)}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={t('cash.amount')}
            type="number"
            inputMode="decimal"
            step="0.01"
            enterKeyHint="next"
            autoFocus
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />
          <Field
            label={t('cash.reason')}
            enterKeyHint="done"
            placeholder={type === 'ManualIncome' ? t('cash.reasonPlaceholderIn') : t('cash.reasonPlaceholderOut')}
            {...register('reason')}
            error={errors.reason?.message}
          />
          {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>{t('cash.record')}</SubmitButton>
        </form>
      </div>
    </div>
  )
}
