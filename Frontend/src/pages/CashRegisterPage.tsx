import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  api, ApiError,
  type CashRegisterSummaryDto,
  type CashRegisterTransactionDto,
  type CashTransactionType,
} from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'
import Sheet from '../components/Sheet'
import StickyActions from '../components/StickyActions'
import PrimaryButton from '../components/PrimaryButton'

type RangeKey = 'today' | 'yesterday' | '7d' | '30d'

interface Range { from: Date; to: Date }

function rangeFor(key: RangeKey): Range {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today':     { const tm = new Date(startOfToday); tm.setDate(tm.getDate() + 1); return { from: startOfToday, to: tm } }
    case 'yesterday': { const y  = new Date(startOfToday); y.setDate(y.getDate() - 1);   return { from: y,           to: startOfToday } }
    case '7d':        { const s  = new Date(startOfToday); s.setDate(s.getDate() - 6); const tm = new Date(startOfToday); tm.setDate(tm.getDate() + 1); return { from: s, to: tm } }
    case '30d':       { const s  = new Date(startOfToday); s.setDate(s.getDate() - 29); const tm = new Date(startOfToday); tm.setDate(tm.getDate() + 1); return { from: s, to: tm } }
  }
}

const TX_DOT: Record<CashTransactionType, string> = {
  OrderPayment:  'bg-ok',
  Refund:        'bg-danger',
  ManualIncome:  'bg-info',
  ManualExpense: 'bg-warn',
}

export default function CashRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()

  const canView   = perm.has('ViewCashRegister')
  const canManage = perm.has('ManageCashRegister')

  const [rangeKey, setRangeKey] = useState<RangeKey>('today')
  const [summary, setSummary] = useState<CashRegisterSummaryDto | null>(null)
  const [transactions, setTransactions] = useState<CashRegisterTransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const fromIso = range.from.toISOString()
  const toIso   = range.to.toISOString()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, txs] = await Promise.all([
        api.cashRegister.summary(fromIso, toIso),
        api.cashRegister.transactions({ from: fromIso, to: toIso, limit: 100 }),
      ])
      setSummary(s); setTransactions(txs)
    } catch {
      setError(t('cash.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [fromIso, toIso, t])

  useEffect(() => { load() }, [load])
  useRealtimeEvent('orderChanged', load)

  if (!canView) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative h-full overflow-hidden">
      <main className={`page-enter h-full overflow-y-auto ${canManage ? 'pb-[100px]' : 'pb-7'}`}>
        <AppHeader
          onBack={() => navigate('/dashboard')}
          title={t('cash.title')}
          subtitle={t('cash.subtitle')}
        />

        <div className="flex gap-2 px-5 pt-2 pb-3.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['today', 'yesterday', '7d', '30d'] as RangeKey[]).map(k => (
            <Chip key={k} active={rangeKey === k} onClick={() => setRangeKey(k)}>
              {t(`reports.range.${k}`)}
            </Chip>
          ))}
        </div>

        {error ? (
          <div className="flex flex-col items-center text-center px-6 pt-12 gap-3">
            <p className="m-0 text-sm text-danger">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <div className="px-5 flex flex-col gap-4">
            {/* Dark drawer balance card */}
            <div
              className="rounded-[20px] py-4 px-4.5"
              style={{
                background: 'var(--color-bg-inverse)',
                color: 'var(--color-fg-inverse)',
                padding: '16px 18px',
                boxShadow: '0 10px 24px -8px rgba(15,15,16,.14), 0 1px 3px rgba(15,15,16,.06)',
              }}
            >
              <p className="m-0 text-[10.5px] font-bold uppercase opacity-70" style={{ letterSpacing: '0.06em' }}>
                {t('cash.balance')}
              </p>
              <p className="m-0 mt-1 text-[28px] font-bold tabular-nums" style={{ letterSpacing: '-0.025em' }}>
                {loading ? '—' : formatPrice(summary?.cashBalance ?? 0)}
              </p>
              <p className="m-0 mt-1 text-xs opacity-60">{t('cash.balanceHint')}</p>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-2">
              <Kpi label={t('cash.kpi.cashIn')}    value={loading ? '—' : formatPrice(summary?.incomeCash ?? 0)} />
              <Kpi label={t('cash.kpi.cardIn')}    value={loading ? '—' : formatPrice(summary?.incomeCard ?? 0)} />
              <Kpi label={t('cash.kpi.manualIn')}  value={loading ? '—' : formatPrice(summary?.manualIncome ?? 0)} />
              <Kpi label={t('cash.kpi.manualOut')} value={loading ? '—' : formatPrice(Math.abs(summary?.manualExpense ?? 0))} />
            </div>

            {/* Transactions */}
            <div>
              <p className="m-0 mb-2 px-1 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
                {t('cash.history')}
              </p>
              {loading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 rounded-[18px] bg-card animate-pulse"
                         style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="m-0 text-sm text-fg-3 px-1">{t('cash.noTransactions')}</p>
              ) : (
                <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                  {transactions.map(tx => {
                    const positive = tx.amount > 0
                    return (
                      <li
                        key={tx.id}
                        className="bg-card rounded-[18px] py-3 px-3.5 flex items-center gap-3"
                        style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${TX_DOT[tx.type]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="m-0 text-sm font-semibold">
                            {t(`cash.txType.${tx.type}`)}
                            <span className="text-fg-3 font-medium"> · {t(`cash.method.${tx.method}`)}</span>
                          </p>
                          <p className="m-0 mt-0.5 text-[11px] text-fg-3 truncate">
                            {new Date(tx.createdAt).toLocaleString()}
                            {tx.reason && <span> · {tx.reason}</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`m-0 text-sm font-bold tabular-nums ${positive ? 'text-ok' : 'text-danger'}`}>
                            {positive ? '+' : ''}{formatPrice(tx.amount)}
                          </p>
                          {tx.method === 'Cash' && (
                            <p className="m-0 text-[11px] text-fg-3 tabular-nums">→ {formatPrice(tx.balanceAfter)}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      {canManage && (
        <StickyActions>
          <PrimaryButton kind="primary" onClick={() => setManualOpen(true)} icon={<PlusIcon />}>
            {t('cash.recordOp')}
          </PrimaryButton>
        </StickyActions>
      )}

      {manualOpen && (
        <ManualOpSheet onClose={() => setManualOpen(false)} onSaved={() => { setManualOpen(false); load() }} />
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl px-3.5 py-3"
         style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
      <p className="m-0 text-[10px] font-bold uppercase text-fg-3 truncate" style={{ letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p className="m-0 mt-1 text-[15.5px] font-bold tabular-nums text-fg truncate" style={{ letterSpacing: '-0.01em' }}>
        {value}
      </p>
    </div>
  )
}

interface ManualOpProps { onClose: () => void; onSaved: () => void }

function ManualOpSheet({ onClose, onSaved }: ManualOpProps) {
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
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('cash.errors.saveFailed'))
    }
  }

  return (
    <Sheet open onClose={onClose} title={t('cash.recordOp')}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['ManualIncome', 'ManualExpense'] as const).map(t2 => (
          <button
            key={t2}
            type="button"
            onClick={() => setType(t2)}
            className={`tappable border-0 py-3 rounded-2xl text-sm font-semibold transition
              ${type === t2 ? 'bg-accent text-white' : 'bg-muted text-fg-2'}`}
          >
            {t(`cash.txType.${t2}`)}
          </button>
        ))}
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
        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('cash.record')}</SubmitButton>
      </form>
    </Sheet>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
