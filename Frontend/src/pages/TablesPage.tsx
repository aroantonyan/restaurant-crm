import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type TableDto, type TableStatus } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'
import StatusPill from '../components/StatusPill'
import Sheet from '../components/Sheet'
import PrimaryButton from '../components/PrimaryButton'
import EmptyState from '../components/EmptyState'
import { Armchair } from 'lucide-react'

type FilterStatus = 'all' | 'Free' | 'Occupied' | 'Reserved'

function tableKind(status: string): 'ok' | 'warn' | 'info' | 'muted' {
  if (status === 'Free')     return 'ok'
  if (status === 'Occupied') return 'warn'
  if (status === 'Reserved') return 'info'
  return 'muted'
}

type ModalState = TableDto | 'new' | null

interface ModalProps {
  state: Exclude<ModalState, null>
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const STATUS_OPTIONS: TableStatus[] = ['Free', 'Occupied', 'Reserved']

function TableFormSheet({ state, onClose, onSaved, onDeleted }: ModalProps) {
  const { t } = useTranslation()
  const isEdit = state !== 'new'
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<TableStatus>(isEdit ? (state.status as TableStatus) : 'Free')
  const [statusSaving, setStatusSaving] = useState(false)

  const changeStatus = async (next: TableStatus) => {
    if (!isEdit || next === status) return
    const prev = status
    setStatus(next)              // optimistic
    setStatusSaving(true)
    setServerError(null)
    try {
      await api.tables.setStatus(state.id, next)
    } catch (e) {
      setStatus(prev)            // rollback
      setServerError(e instanceof ApiError ? e.message : t('tables.errors.saveFailed'))
    } finally {
      setStatusSaving(false)
    }
  }

  const schema = z.object({
    number:    z.number({ error: t('auth.errors.required') }).int().positive(),
    capacity:  z.number({ error: t('auth.errors.required') }).int().min(1).max(50),
    isVip:     z.boolean(),
    vipAmount: z.number({ error: t('auth.errors.required') }).min(0).max(99_999_999),
  }).refine(d => !d.isVip || d.vipAmount > 0, {
    path: ['vipAmount'],
    error: t('tables.vipAmountRequired'),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { number: state.number, capacity: state.capacity, isVip: state.isVip, vipAmount: state.vipAmount }
      : ({ capacity: 4, isVip: false, vipAmount: 0 } as FormData),
  })

  const isVip = watch('isVip')

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const payload = {
        number: data.number,
        capacity: data.capacity,
        isVip: data.isVip,
        vipAmount: data.isVip ? data.vipAmount : 0,
      }
      if (isEdit) await api.tables.update(state.id, payload)
      else await api.tables.create(payload)
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('tables.errors.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    setDeleting(true)
    setServerError(null)
    try {
      await api.tables.delete(state.id)
      onDeleted()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('tables.errors.deleteFailed'))
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={isEdit ? t('tables.editTitle') : t('tables.add')}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field
          label={t('tables.number')}
          type="number"
          inputMode="numeric"
          enterKeyHint="next"
          autoFocus={!isEdit}
          {...register('number', { valueAsNumber: true })}
          error={errors.number?.message}
        />
        <Field
          label={t('tables.capacity')}
          type="number"
          inputMode="numeric"
          enterKeyHint="done"
          {...register('capacity', { valueAsNumber: true })}
          error={errors.capacity?.message}
        />

        {/* VIP toggle — display-only label + amount the cashier collects manually. */}
        <button
          type="button"
          onClick={() => setValue('isVip', !isVip, { shouldDirty: true, shouldValidate: true })}
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-card border border-line text-left tappable"
          style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
        >
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold text-fg">{t('tables.vipLabel')}</span>
            <span className="text-[12px] text-fg-3 mt-0.5">{t('tables.vipHint')}</span>
          </span>
          <span
            className={`w-12 h-7 rounded-full shrink-0 relative transition-colors ${isVip ? 'bg-accent' : 'bg-line-strong'}`}
            aria-hidden
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${isVip ? 'translate-x-5' : ''}`} />
          </span>
        </button>
        <input type="hidden" {...register('isVip')} />

        {isVip && (
          <Field
            label={t('tables.vipAmount')}
            type="number"
            inputMode="decimal"
            step="0.01"
            enterKeyHint="done"
            {...register('vipAmount', { valueAsNumber: true })}
            error={errors.vipAmount?.message}
          />
        )}

        {isEdit && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase text-fg-3 px-1" style={{ letterSpacing: '0.06em' }}>
              {t('tables.statusLabel')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  disabled={statusSaving}
                  onClick={() => changeStatus(s)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition border-0 tappable disabled:opacity-60
                    ${status === s ? 'bg-accent text-white' : 'bg-muted text-fg-2'}`}
                >
                  {t(`tables.status.${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}

        <SubmitButton loading={isSubmitting}>
          {isEdit ? t('staff.edit.submit') : t('tables.add')}
        </SubmitButton>
      </form>

      {isEdit && (
        <div className="mt-5 pt-4 border-t border-line">
          {!confirmingDelete ? (
            <PrimaryButton kind="dangerSoft" onClick={() => setConfirmingDelete(true)}>
              {t('tables.delete')}
            </PrimaryButton>
          ) : (
            <div className="flex gap-2.5">
              <PrimaryButton kind="neutral" onClick={() => setConfirmingDelete(false)}>
                {t('staff.edit.cancel')}
              </PrimaryButton>
              <PrimaryButton kind="danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? t('common.loading') : t('tables.deleteConfirm')}
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

export default function TablesPage() {
  const { t } = useTranslation()
  const perm = usePermissions()

  const [tables, setTables] = useState<TableDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [modal, setModal] = useState<ModalState>(null)

  const canManage = perm.has('ManageTables')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setTables(await api.tables.getAll())
    } catch {
      setError(t('tables.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useRealtimeEvent('tableChanged', () => { load() })

  const visible = useMemo(() => {
    const sorted = [...tables].sort((a, b) => a.number - b.number)
    return filter === 'all' ? sorted : sorted.filter(t => t.status === filter)
  }, [tables, filter])

  const counts = useMemo(() => {
    const c = { all: tables.length, Free: 0, Occupied: 0, Reserved: 0 }
    for (const tb of tables) {
      if (tb.status in c) c[tb.status as keyof typeof c]++
    }
    return c
  }, [tables])

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        title={t('tables.title')}
        subtitle={`${counts.Free} ${t('tables.status.Free').toLowerCase()} · ${counts.Occupied} ${t('tables.status.Occupied').toLowerCase()}`}
        trailing={canManage ? (
          <button
            type="button"
            onClick={() => setModal('new')}
            aria-label={t('tables.add')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      {!loading && !error && tables.length > 0 && (
        <div className="flex gap-2 px-5 pt-2 pb-3.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip active={filter === 'all'}      onClick={() => setFilter('all')}      count={counts.all}>{t('orders.filter.all')}</Chip>
          <Chip active={filter === 'Free'}     onClick={() => setFilter('Free')}     count={counts.Free}>{t('tables.status.Free')}</Chip>
          <Chip active={filter === 'Occupied'} onClick={() => setFilter('Occupied')} count={counts.Occupied}>{t('tables.status.Occupied')}</Chip>
          <Chip active={filter === 'Reserved'} onClick={() => setFilter('Reserved')} count={counts.Reserved}>{t('tables.status.Reserved')}</Chip>
        </div>
      )}

      <div className="px-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-2xl bg-card animate-pulse"
                   style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center pt-16 gap-3">
            <p className="m-0 text-sm text-danger">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : tables.length === 0 ? (
          <EmptyState icon={Armchair} title={t('tables.noTables')} hint={t('tables.noTablesHint')} />
        ) : visible.length === 0 ? (
          <p className="m-0 text-center text-sm text-fg-3 pt-12">—</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {visible.map((table, idx) => (
              <button
                key={table.id}
                type="button"
                onClick={() => canManage && setModal(table)}
                disabled={!canManage}
                className="item-enter tappable bg-card border-0 rounded-2xl px-3.5 py-3.5 text-left flex flex-col gap-1.5"
                style={{
                  animationDelay: `${idx * 30}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
                    {table.isVip ? (
                      <span className="inline-flex items-center gap-0.5 text-accent">⭐ {t('tables.vipTag')}</span>
                    ) : (
                      t('tables.label', { defaultValue: 'Table' })
                    )}
                  </span>
                  <StatusPill kind={tableKind(table.status)} size="sm">
                    {t(`tables.status.${table.status}`)}
                  </StatusPill>
                </div>
                <p className="m-0 text-[32px] font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.02em' }}>
                  {table.number}
                </p>
                <p className="m-0 text-xs text-fg-3">
                  {t('tables.seats', { count: table.capacity })}
                  {table.isVip && <span className="text-accent"> · {formatPrice(table.vipAmount)}</span>}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <TableFormSheet
          state={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
          onDeleted={() => { setModal(null); load() }}
        />
      )}
    </main>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
