import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type TableDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { getTelegram } from '../lib/telegram'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'

type FilterStatus = 'all' | 'Free' | 'Occupied' | 'Reserved'

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  Free:     { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-500/10' },
  Occupied: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-500/10' },
  Reserved: { dot: 'bg-blue-500',  text: 'text-blue-600',  bg: 'bg-blue-500/10'  },
}

// `'new'` for the add modal, an existing table for the edit modal, null for closed.
type ModalState = TableDto | 'new' | null

// ---- Add / Edit modal ----

interface ModalProps {
  state: Exclude<ModalState, null>
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function TableFormModal({ state, onClose, onSaved, onDeleted }: ModalProps) {
  const { t } = useTranslation()
  const isEdit = state !== 'new'
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Backend rules: number > 0, capacity 1..50.
  // `valueAsNumber: true` on register turns the input string into a Number before validation.
  const schema = z.object({
    number: z
      .number({ error: t('auth.errors.required') })
      .int()
      .positive(),
    capacity: z
      .number({ error: t('auth.errors.required') })
      .int()
      .min(1)
      .max(50),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { number: state.number, capacity: state.capacity }
      : { capacity: 4 } as FormData,
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      if (isEdit) {
        await api.tables.update(state.id, { number: data.number, capacity: data.capacity })
      } else {
        await api.tables.create({ number: data.number, capacity: data.capacity })
      }
      getTelegram()?.HapticFeedback?.impactOccurred('light')
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
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onDeleted()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('tables.errors.deleteFailed'))
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[90%] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">
            {isEdit ? t('tables.editTitle') : t('tables.add')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none"
            aria-label={t('common.back')}
          >
            ×
          </button>
        </div>

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

          {isEdit && (
            <p className="text-xs text-tg-hint">
              {t(`tables.status.${state.status}`)}
            </p>
          )}

          {serverError && (
            <p className="text-tg-destructive text-sm text-center">{serverError}</p>
          )}

          <SubmitButton loading={isSubmitting}>
            {isEdit ? t('staff.edit.submit') : t('tables.add')}
          </SubmitButton>
        </form>

        {isEdit && (
          <div className="mt-6 pt-5 border-t border-tg-secondary-bg">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full py-3.5 rounded-xl text-sm font-medium text-tg-destructive bg-tg-secondary-bg active:scale-[0.98] transition"
              >
                {t('tables.delete')}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-tg-secondary-bg text-tg-text"
                >
                  {t('staff.edit.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-tg-destructive text-white disabled:opacity-50"
                >
                  {deleting ? t('common.loading') : t('tables.deleteConfirm')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Main page ----

export default function TablesPage() {
  const { t } = useTranslation()
  const perm = usePermissions()
  useBackButton('/dashboard')

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
      const data = await api.tables.getAll()
      setTables(data)
    } catch {
      setError(t('tables.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Any table change (status flip, create, delete) → refresh.
  useRealtimeEvent('tableChanged', () => { load() })

  // Sorted by number; filter by status when set.
  const visible = useMemo(() => {
    const sorted = [...tables].sort((a, b) => a.number - b.number)
    return filter === 'all' ? sorted : sorted.filter(t => t.status === filter)
  }, [tables, filter])

  // Counts per status — shown on the filter chips so the user always sees totals.
  const counts = useMemo(() => {
    const c = { all: tables.length, Free: 0, Occupied: 0, Reserved: 0 }
    for (const tb of tables) {
      if (tb.status in c) c[tb.status as keyof typeof c]++
    }
    return c
  }, [tables])

  const handleCardClick = (table: TableDto) => {
    if (!canManage) return
    setModal(table)
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('tables.title')}</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setModal('new')}
            className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium active:scale-[0.98] transition"
          >
            + {t('tables.add')}
          </button>
        )}
      </header>

      {/* Status filter chips — always visible (helpful even with one table) */}
      {!loading && !error && tables.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          {(['all', 'Free', 'Occupied', 'Reserved'] as FilterStatus[]).map(key => {
            const active = filter === key
            const count = counts[key]
            const label = key === 'all' ? t('orders.filter.all') : t(`tables.status.${key}`)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={[
                  'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition',
                  active
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-secondary-bg text-tg-hint',
                ].join(' ')}
              >
                {label} <span className={active ? 'opacity-80' : 'opacity-60'}>· {count}</span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square rounded-2xl bg-tg-secondary-bg animate-pulse" />
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
            {t('common.retry')}
          </button>
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">🍽️</div>
          <p className="text-tg-text font-medium">{t('tables.noTables')}</p>
          <p className="text-tg-hint text-sm">{t('tables.noTablesHint')}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center mt-12 text-tg-hint text-sm">
          —
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {visible.map(table => {
            const s = STATUS_STYLES[table.status] ?? STATUS_STYLES.Free
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => handleCardClick(table)}
                disabled={!canManage}
                className={[
                  'aspect-square flex flex-col items-center justify-between p-3 rounded-2xl bg-tg-secondary-bg text-left',
                  canManage ? 'active:scale-[0.97] transition' : 'cursor-default',
                ].join(' ')}
              >
                <span className="self-start text-xs text-tg-hint font-medium">№</span>
                <span className="text-3xl font-bold text-tg-text leading-none">{table.number}</span>
                <span className="text-xs text-tg-hint">
                  {t('tables.seats', { count: table.capacity })}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {t(`tables.status.${table.status}`)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {modal && (
        <TableFormModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
          onDeleted={() => { setModal(null); load() }}
        />
      )}
    </main>
  )
}
