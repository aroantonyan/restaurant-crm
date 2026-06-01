import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ClientDto, type ReservationDto, type ReservationStatus, type TableDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { getTelegram } from '../../lib/telegram'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'
import Portal from '../../components/Portal'
import AppHeader from '../../components/AppHeader'
import Chip from '../../components/Chip'
import { CalendarDays } from 'lucide-react'

type FilterKey = 'upcoming' | 'today' | 'past' | 'all'

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240]

const STATUS_STYLES: Record<ReservationStatus, { dot: string; text: string; bg: string }> = {
  Confirmed: { dot: 'bg-blue-500',   text: 'text-blue-600',   bg: 'bg-blue-500/10'   },
  Seated:    { dot: 'bg-amber-500',  text: 'text-amber-600',  bg: 'bg-amber-500/10'  },
  Completed: { dot: 'bg-green-500',  text: 'text-green-600',  bg: 'bg-green-500/10'  },
  Cancelled: { dot: 'bg-fg-3',    text: 'text-fg-3',    bg: 'bg-card' },
  NoShow:    { dot: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-500/10'    },
}

type ModalState = ReservationDto | 'new' | null

// ---- time helpers ----

// Date → "YYYY-MM-DDTHH:mm" in local time, the format <input type="datetime-local"> expects.
function dateToLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "YYYY-MM-DDTHH:mm" (local) → UTC ISO string for the API.
function localInputToUtcIso(localStr: string): string {
  return new Date(localStr).toISOString()
}

function utcIsoToLocalInput(iso: string): string {
  return dateToLocalInput(new Date(iso))
}

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number, t: (key: string) => string): string {
  const key =
    minutes === 30  ? 'min30' :
    minutes === 60  ? 'h1'   :
    minutes === 90  ? 'h1_5' :
    minutes === 120 ? 'h2'   :
    minutes === 150 ? 'h2_5' :
    minutes === 180 ? 'h3'   :
    minutes === 240 ? 'h4'   : null
  return key ? t(`reservations.duration.${key}`) : `${minutes} min`
}

// ---- Card ----

interface CardProps {
  reservation: ReservationDto
  onClick: () => void
  locale: string
}

function ReservationCard({ reservation: r, onClick, locale }: CardProps) {
  const { t } = useTranslation()
  const s = STATUS_STYLES[r.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-card px-4 py-3.5 flex flex-col gap-1.5 active:scale-[0.98] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-fg truncate">{r.guestName}</span>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {t(`reservations.status.${r.status}`)}
        </span>
      </div>
      <p className="text-xs text-fg-3">
        {t('reservations.guestsCount', { count: r.guestCount })} · {t('reservations.fields.table')} №{r.tableNumber}
      </p>
      <p className="text-xs text-fg/80">
        {formatDateTime(r.startAt, locale)} · {formatDuration(r.durationMinutes, t)}
      </p>
    </button>
  )
}

// ---- Form modal ----

interface ModalProps {
  state: Exclude<ModalState, null>
  tables: TableDto[]
  onClose: () => void
  onSaved: () => void
}

function ReservationFormModal({ state, tables, onClose, onSaved }: ModalProps) {
  const { t } = useTranslation()
  const isEdit = state !== 'new'
  const editable = isEdit
    ? !(state.status === 'Completed' || state.status === 'Cancelled' || state.status === 'NoShow')
    : true

  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  // Linked CRM client (optional). When set, guestName/Phone are still kept as a
  // snapshot — the server stores them independently of the client so old
  // reservations remain readable if a client is later renamed or archived.
  const [linkedClientId, setLinkedClientId] = useState<string | null>(
    isEdit ? (state.clientId ?? null) : null,
  )
  const [linkedClientName, setLinkedClientName] = useState<string | null>(
    isEdit ? (state.clientName ?? null) : null,
  )
  const [pickingClient, setPickingClient] = useState(false)

  // Validation mirrors backend rules.
  const schema = z.object({
    tableId: z.string().min(1, t('auth.errors.required')),
    guestName: z.string().min(1, t('auth.errors.required')).max(200, t('auth.errors.tooLong')),
    guestPhone: z.string().max(30, t('auth.errors.tooLong')).optional(),
    guestCount: z.number().int().min(1).max(50),
    startAtLocal: z.string().min(1, t('auth.errors.required')),
    durationMinutes: z.number().int().min(15).max(600),
    notes: z.string().max(500, t('auth.errors.tooLong')).optional(),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          tableId: state.tableId,
          guestName: state.guestName,
          guestPhone: state.guestPhone ?? '',
          guestCount: state.guestCount,
          startAtLocal: utcIsoToLocalInput(state.startAt),
          durationMinutes: state.durationMinutes,
          notes: state.notes ?? '',
        }
      : {
          tableId: tables[0]?.id ?? '',
          guestName: '',
          guestPhone: '',
          guestCount: 2,
          startAtLocal: dateToLocalInput(roundToNextHalfHour(new Date())),
          durationMinutes: 120,
          notes: '',
        },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const payload = {
      tableId: data.tableId,
      guestName: data.guestName.trim(),
      guestPhone: data.guestPhone?.trim() || undefined,
      guestCount: data.guestCount,
      startAt: localInputToUtcIso(data.startAtLocal),
      durationMinutes: data.durationMinutes,
      notes: data.notes?.trim() || undefined,
      clientId: linkedClientId,
    }
    try {
      if (isEdit) await api.reservations.update(state.id, payload)
      else        await api.reservations.create(payload)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('reservations.errors.saveFailed'))
    }
  }

  const setStatus = async (next: ReservationStatus) => {
    if (!isEdit) return
    setBusy(true)
    setServerError(null)
    try {
      await api.reservations.setStatus(state.id, next)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('reservations.errors.statusFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!isEdit) return
    setBusy(true)
    setServerError(null)
    try {
      await api.reservations.delete(state.id)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('reservations.errors.deleteFailed'))
      setConfirmingDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-in" onClick={onClose} style={{ paddingBottom: 'var(--keyboard-offset, 0px)', transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div
        className="bg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[88dvh] overflow-y-auto sheet-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">
            {isEdit ? t('reservations.editTitle') : t('reservations.newTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-fg-3 text-xl leading-none"
            aria-label={t('common.back')}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* CRM client picker — chip-style. Tap to open a search sheet. When picked,
              the name/phone fields are pre-filled (still editable for one-off overrides). */}
          {editable && (
            <button
              type="button"
              onClick={() => setPickingClient(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card text-left w-full active:scale-[0.98] transition"
            >
              <span className="text-lg" aria-hidden>👤</span>
              <span className="flex-1 text-sm font-medium text-fg truncate">
                {linkedClientName ?? t('reservations.pickClient')}
              </span>
              {linkedClientName && (
                <span
                  role="button"
                  onClick={e => {
                    e.stopPropagation()
                    setLinkedClientId(null)
                    setLinkedClientName(null)
                  }}
                  className="text-danger text-xs px-2 py-1"
                >
                  ✕
                </span>
              )}
              <span className="text-fg-3 text-xs">{linkedClientName ? t('reservations.changeClient') : ''}</span>
            </button>
          )}
          {!editable && linkedClientName && (
            <p className="text-sm text-fg">
              <span className="mr-1">👤</span>{linkedClientName}
            </p>
          )}

          <Field
            label={t('reservations.fields.guestName')}
            enterKeyHint="next"
            autoFocus={!isEdit}
            disabled={!editable}
            {...register('guestName')}
            error={errors.guestName?.message}
          />
          <Field
            label={t('reservations.fields.guestPhone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            disabled={!editable}
            {...register('guestPhone')}
            error={errors.guestPhone?.message}
          />
          <Field
            label={t('reservations.fields.guestCount')}
            type="number"
            inputMode="numeric"
            enterKeyHint="next"
            disabled={!editable}
            {...register('guestCount', { valueAsNumber: true })}
            error={errors.guestCount?.message}
          />
          <Select
            label={t('reservations.fields.table')}
            options={tables.map(tb => ({ value: tb.id, label: `№${tb.number} · ${tb.capacity}` }))}
            disabled={!editable}
            {...register('tableId')}
            error={errors.tableId?.message}
          />
          <Field
            label={t('reservations.fields.startAt')}
            type="datetime-local"
            enterKeyHint="next"
            disabled={!editable}
            {...register('startAtLocal')}
            error={errors.startAtLocal?.message}
          />
          <Select
            label={t('reservations.fields.duration')}
            options={DURATION_OPTIONS.map(m => ({ value: String(m), label: formatDuration(m, t) }))}
            disabled={!editable}
            {...register('durationMinutes', { valueAsNumber: true })}
            error={errors.durationMinutes?.message}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-3 uppercase tracking-wide px-1">
              {t('reservations.fields.notes')}
            </span>
            <textarea
              {...register('notes')}
              disabled={!editable}
              rows={2}
              className="bg-card text-fg rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent transition scroll-mb-30 resize-none disabled:opacity-60"
            />
            {errors.notes && <span className="text-danger text-[13px] px-1">{errors.notes.message}</span>}
          </div>

          {serverError && (
            <p className="text-danger text-sm text-center">{serverError}</p>
          )}

          {editable && (
            <SubmitButton loading={isSubmitting}>
              {isEdit ? t('staff.edit.submit') : t('reservations.add')}
            </SubmitButton>
          )}
        </form>

        {/* Status transitions, gated by current status */}
        {isEdit && (
          <div className="mt-6 pt-5 border-t border-line flex flex-col gap-2">
            {state.status === 'Confirmed' && (
              <>
                <ActionButton onClick={() => setStatus('Seated')} disabled={busy} tone="primary">
                  {t('reservations.actions.seat')}
                </ActionButton>
                <ActionButton onClick={() => setStatus('Cancelled')} disabled={busy} tone="muted">
                  {t('reservations.actions.cancel')}
                </ActionButton>
                <ActionButton onClick={() => setStatus('NoShow')} disabled={busy} tone="muted">
                  {t('reservations.actions.noShow')}
                </ActionButton>
              </>
            )}
            {state.status === 'Seated' && (
              <>
                <ActionButton onClick={() => setStatus('Completed')} disabled={busy} tone="primary">
                  {t('reservations.actions.complete')}
                </ActionButton>
                <ActionButton onClick={() => setStatus('Cancelled')} disabled={busy} tone="muted">
                  {t('reservations.actions.cancel')}
                </ActionButton>
              </>
            )}
            {(state.status === 'Cancelled' || state.status === 'NoShow') && (
              <ActionButton onClick={() => setStatus('Confirmed')} disabled={busy} tone="primary">
                {t('reservations.actions.restore')}
              </ActionButton>
            )}

            {/* Delete is always available (admins clean up cancelled ones) */}
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full py-3.5 rounded-xl text-sm font-medium text-danger bg-card mt-2 active:scale-[0.98] transition"
              >
                {t('reservations.actions.delete')}
              </button>
            ) : (
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-card text-fg"
                >
                  {t('staff.edit.cancel')}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-danger text-white disabled:opacity-50"
                >
                  {busy ? t('common.loading') : t('reservations.actions.deleteConfirm')}
                </button>
              </div>
            )}

            <p className="text-[11px] text-fg-3 text-center mt-2">
              {t('reservations.createdBy')} {state.createdByName} · {formatDateTime(state.createdAt, 'en')}
            </p>
          </div>
        )}
      </div>

      {pickingClient && (
        <ClientPicker
          currentClientId={linkedClientId}
          onClose={() => setPickingClient(false)}
          onPick={client => {
            if (client) {
              setLinkedClientId(client.id)
              setLinkedClientName(client.fullName)
              // Pre-fill name/phone so they're stored as a snapshot — still editable.
              setValue('guestName', client.fullName)
              if (client.phone) setValue('guestPhone', client.phone)
            } else {
              setLinkedClientId(null)
              setLinkedClientName(null)
            }
            setPickingClient(false)
          }}
        />
      )}
    </div>
    </Portal>
  )
}

// ---- Client picker for reservation linkage ----

interface ClientPickerProps {
  currentClientId: string | null
  onClose: () => void
  onPick: (client: ClientDto | null) => void
}

function ClientPicker({ currentClientId, onClose, onPick }: ClientPickerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Debounced search — collapses both initial load and typing into one effect.
    if (search === '') {
      setLoading(true)
      api.clients.getAll()
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
      return
    }
    setLoading(true)
    const handle = setTimeout(() => {
      api.clients.getAll({ search })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search])

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40 backdrop-in" onClick={onClose} style={{ paddingBottom: 'var(--keyboard-offset, 0px)', transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="bg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[88dvh] flex flex-col sheet-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t('reservations.pickClient')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-fg-3 text-xl leading-none">×</button>
        </div>

        <input
          type="search"
          autoFocus
          placeholder={t('clients.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-card text-fg rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent transition mb-3"
        />

        {currentClientId && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="w-full mb-3 py-3 rounded-xl bg-card text-danger font-medium active:scale-[0.98] transition"
          >
            × {t('reservations.unlinkClient')}
          </button>
        )}

        <div className="overflow-y-auto flex flex-col gap-2">
          {loading ? (
            <p className="text-fg-3 text-sm text-center py-4">{t('common.loading')}</p>
          ) : results.length === 0 ? (
            <p className="text-fg-3 text-sm text-center py-4">{t('clients.empty')}</p>
          ) : results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card text-left active:scale-[0.98] transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.fullName}</p>
                <p className="text-[11px] text-fg-3 mt-0.5 truncate">{c.phone ?? t('clients.noPhone')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
    </Portal>
  )
}

function ActionButton({ children, onClick, disabled, tone }: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  tone: 'primary' | 'muted'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] transition disabled:opacity-50',
        tone === 'primary'
          ? 'bg-accent text-white'
          : 'bg-card text-fg',
      ].join(' ')}
    >
      {children}
    </button>
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

function roundToNextHalfHour(d: Date): Date {
  const r = new Date(d)
  r.setSeconds(0, 0)
  const m = r.getMinutes()
  r.setMinutes(m < 30 ? 30 : 60, 0, 0)
  return r
}

// ---- Page ----

export default function ReservationsPage() {
  const { t, i18n } = useTranslation()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const [reservations, setReservations] = useState<ReservationDto[]>([])
  const [tables, setTables] = useState<TableDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('upcoming')
  const [modal, setModal] = useState<ModalState>(null)

  const canManage = perm.has('ManageReservations')

  const queryParams = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    switch (filter) {
      case 'upcoming': return { from: now.toISOString(), status: 'Confirmed' as const }
      case 'today':    return { from: startOfToday.toISOString(), to: startOfTomorrow.toISOString() }
      case 'past':     return { to: now.toISOString() }
      case 'all':      return {}
    }
  }, [filter])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resList, tablesList] = await Promise.all([
        api.reservations.getAll(queryParams),
        // Tables are needed for the form modal — cache them here.
        tables.length === 0 ? api.tables.getAll() : Promise.resolve(tables),
      ])
      setReservations(resList)
      if (tables.length === 0) setTables(tablesList)
    } catch {
      setError(t('reservations.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  // Push: any reservation change → refresh the current filtered view.
  useRealtimeEvent('reservationChanged', () => { load() })

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader
        title={t('reservations.title')}
        trailing={canManage && tables.length > 0 ? (
          <button
            type="button"
            onClick={() => setModal('new')}
            aria-label={t('reservations.add')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      {/* Filter chips */}
      <div
        className="flex gap-2 px-5 pt-2 pb-3.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {(['upcoming', 'today', 'past', 'all'] as FilterKey[]).map(key => (
          <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
            {t(`reservations.filter.${key}`)}
          </Chip>
        ))}
      </div>

      <div className="px-5">
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-card text-fg-3 text-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center px-4">
          <div className="w-16 h-16 rounded-[20px] bg-muted flex items-center justify-center text-fg-3 mb-2"><CalendarDays size={28} strokeWidth={1.9} aria-hidden /></div>
          <p className="text-fg font-medium">{t('reservations.noResults')}</p>
          {tables.length === 0 && (
            <p className="text-fg-3 text-sm">{t('tables.noTablesHint')}</p>
          )}
          {canManage && tables.length > 0 && (
            <p className="text-fg-3 text-sm">{t('reservations.noResultsHint')}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reservations.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onClick={() => (canManage ? setModal(r) : setModal(r))}
              locale={i18n.resolvedLanguage ?? 'en'}
            />
          ))}
        </div>
      )}
      </div>

      {modal && (
        <ReservationFormModal
          state={modal}
          tables={tables}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </main>
  )
}
