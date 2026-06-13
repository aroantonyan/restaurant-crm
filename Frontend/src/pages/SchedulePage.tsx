import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ShiftDto, type StaffMember } from '../lib/api'
import { auth } from '../lib/auth'
import { usePermissions } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import AppHeader from '../components/AppHeader'
import Sheet from '../components/Sheet'
import PrimaryButton from '../components/PrimaryButton'

// ---- Why this layout ----
//
// Reviewed standard restaurant scheduling apps (7shifts, Deputy, Sling, Homebase,
// When I Work). Their desktop view is a week grid: staff names down the left,
// days across the top. That doesn't fit on a phone screen. The common
// mobile pattern they all share is a **vertical day list** — one card per day,
// shifts listed inside.
//
// Two view modes:
//   • Manager (has ManageSchedules): sees everyone's shifts, tap "+" on a day
//     card to create one, tap a shift to edit.
//   • Employee (only ViewSchedules): defaults to "My shifts". Toggle "All staff"
//     reveals everyone for transparency. Server enforces this (a waiter without
//     ManageSchedules is silently scoped to their own shifts regardless of params).

type ViewMode = 'mine' | 'all'

interface DayBucket {
  date: Date
  shifts: ShiftDto[]
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // ISO weeks start Monday — most restaurant scheduling does too.
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function localDateKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${(x.getMonth() + 1).toString().padStart(2, '0')}-${x.getDate().toString().padStart(2, '0')}`
}

function timeHHmm(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const ROLE_COLOR: Record<string, string> = {
  Admin:     'bg-purple-500',
  Manager:   'bg-indigo-500',
  Waiter:    'bg-blue-500',
  Cook:      'bg-orange-500',
  Bartender: 'bg-teal-500',
  Cashier:   'bg-amber-500',
}

export default function SchedulePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const session = auth.getSession()

  const canManage = perm.has('ManageSchedules')
  const myUserId = session?.userId

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>(canManage ? 'all' : 'mine')
  const [shifts, setShifts] = useState<ShiftDto[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ShiftDto | { startAt: Date } | null>(null)

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, st] = await Promise.all([
        api.schedule.get({
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
          // Managers can filter to themselves via the picker. Non-managers always
          // hit the same endpoint; the server silently scopes them to their own shifts.
          userId: viewMode === 'mine' && canManage ? myUserId : undefined,
        }),
        canManage ? api.staff.getAll() : Promise.resolve([] as StaffMember[]),
      ])
      setShifts(s)
      setStaff(st)
    } catch {
      setError(t('schedule.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd, viewMode, canManage, myUserId, t])

  useEffect(() => { load() }, [load])

  // Live: when another manager edits the schedule, our view refreshes.
  useRealtimeEvent('scheduleChanged', load)

  // Bucket shifts by day for the vertical card list.
  const days = useMemo<DayBucket[]>(() => {
    const buckets: DayBucket[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i)
      const key = localDateKey(date)
      buckets.push({
        date,
        shifts: shifts
          .filter(s => localDateKey(s.startAt) === key)
          .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      })
    }
    return buckets
  }, [shifts, weekStart])

  const totalMinutes = useMemo(
    () => shifts.reduce((sum, s) => sum + s.durationMinutes, 0),
    [shifts]
  )

  const fmtDay = (d: Date) =>
    d.toLocaleDateString(i18n.resolvedLanguage ?? undefined, { weekday: 'short', month: 'short', day: 'numeric' })

  const isPast = (d: Date) => d.getTime() < new Date().setHours(0, 0, 0, 0)
  const isToday = (d: Date) => localDateKey(d) === localDateKey(new Date())

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('schedule.title')}
        subtitle={canManage ? t('schedule.subtitleManager') : t('schedule.subtitleEmployee')}
      />

      <div className="px-5">

      {/* Week navigator */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="w-9 h-9 rounded-full bg-card text-fg text-lg active:scale-95 transition"
          aria-label={t('schedule.prevWeek')}
        >‹</button>
        <div className="text-center">
          <p className="text-sm font-semibold tabular-nums">
            {fmtDay(weekStart)} — {fmtDay(addDays(weekStart, 6))}
          </p>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-[11px] text-accent mt-0.5"
          >
            {t('schedule.thisWeek')}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="w-9 h-9 rounded-full bg-card text-fg text-lg active:scale-95 transition"
          aria-label={t('schedule.nextWeek')}
        >›</button>
      </div>

      {/* View mode toggle — manager only (others are silently scoped server-side) */}
      {canManage && (
        <div className="flex gap-2 mb-2">
          {(['all', 'mine'] as ViewMode[]).map(m => {
            const active = viewMode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={[
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition',
                  active ? 'bg-accent text-white' : 'bg-card text-fg-3',
                ].join(' ')}
              >
                {m === 'all' ? t('schedule.viewAll') : t('schedule.viewMine')}
              </button>
            )
          })}
        </div>
      )}

      {/* Week summary */}
      <p className="text-[11px] text-fg-3 mb-4 text-center tabular-nums">
        {t('schedule.weekSummary', {
          count: shifts.length,
          hours: (totalMinutes / 60).toFixed(1),
        })}
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-danger text-sm">{error}</p>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-card text-fg-3 text-sm">
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {days.map(({ date, shifts }) => (
            <DayCard
              key={localDateKey(date)}
              date={date}
              shifts={shifts}
              canManage={canManage}
              myUserId={myUserId}
              isPast={isPast(date)}
              isToday={isToday(date)}
              fmtDay={fmtDay}
              onAdd={() => setEditing({ startAt: date })}
              onEdit={s => setEditing(s)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ShiftFormModal
          initial={editing}
          staff={staff}
          defaultUserId={myUserId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
      </div>
    </main>
  )
}

// ---- Day card ----

interface DayCardProps {
  date: Date
  shifts: ShiftDto[]
  canManage: boolean
  myUserId: string | undefined
  isPast: boolean
  isToday: boolean
  fmtDay: (d: Date) => string
  onAdd: () => void
  onEdit: (s: ShiftDto) => void
}

function DayCard({ date, shifts, canManage, myUserId, isPast, isToday, fmtDay, onAdd, onEdit }: DayCardProps) {
  const { t } = useTranslation()
  const totalH = shifts.reduce((sum, s) => sum + s.durationMinutes, 0) / 60

  return (
    <section className={`rounded-2xl ${isToday ? 'bg-accent/10 ring-1 ring-accent' : 'bg-card'} px-4 py-3`}>
      <header className="flex items-center justify-between mb-2">
        <div>
          <p className={`text-sm font-semibold ${isPast ? 'text-fg-3' : 'text-fg'}`}>
            {fmtDay(date)}
          </p>
          <p className="text-[11px] text-fg-3 tabular-nums">
            {shifts.length === 0
              ? t('schedule.noShifts')
              : t('schedule.dayShifts', { count: shifts.length, hours: totalH.toFixed(1) })}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-accent text-white text-xl leading-none active:scale-95 transition"
            aria-label={t('schedule.addShift')}
          >+</button>
        )}
      </header>

      {shifts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {shifts.map(s => {
            const isMine = s.userId === myUserId
            const role = s.roleForShift ?? s.userRoleName
            const dot = ROLE_COLOR[role] ?? 'bg-gray-500'
            const cancelled = s.status === 'Cancelled'
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => canManage && onEdit(s)}
                  disabled={!canManage}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-bg text-left transition',
                    canManage ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default',
                    cancelled ? 'opacity-50 line-through' : '',
                  ].join(' ')}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMine ? 'text-accent' : 'text-fg'}`}>
                      {s.userName}{isMine && <span className="text-[10px] uppercase tracking-wider"> · {t('schedule.you')}</span>}
                    </p>
                    {s.notes && <p className="text-[11px] text-fg-3 truncate italic">{s.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {timeHHmm(s.startAt)}–{timeHHmm(s.endAt)}
                    </p>
                    <p className="text-[10px] text-fg-3">{role}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---- Create/edit modal ----

interface ShiftFormProps {
  initial: ShiftDto | { startAt: Date }
  staff: StaffMember[]
  defaultUserId: string | undefined
  onClose: () => void
  onSaved: () => void
}

function ShiftFormModal({ initial, staff, defaultUserId, onClose, onSaved }: ShiftFormProps) {
  const { t } = useTranslation()
  const isEdit = 'id' in initial
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const assignable = useMemo(
    () => staff.filter(u => u.status !== 'Inactive'),
    [staff]
  )

  // Defaults: pre-fill 10:00–18:00 on the chosen day for new shifts.
  const initialDate = isEdit ? new Date(initial.startAt) : initial.startAt
  const defaultStart = isEdit
    ? new Date(initial.startAt)
    : new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 10, 0)
  const defaultEnd = isEdit
    ? new Date(initial.endAt)
    : new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 18, 0)

  // datetime-local needs "YYYY-MM-DDTHH:mm" in LOCAL time.
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const schema = z.object({
    userId: z.string().min(1, { error: t('auth.errors.required') }),
    startAt: z.string().min(1, { error: t('auth.errors.required') }),
    endAt: z.string().min(1, { error: t('auth.errors.required') }),
    roleForShift: z.string().max(50).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      userId: isEdit ? initial.userId : (defaultUserId ?? ''),
      startAt: toLocalInput(defaultStart),
      endAt: toLocalInput(defaultEnd),
      roleForShift: isEdit ? (initial.roleForShift ?? '') : '',
      notes: isEdit ? (initial.notes ?? '') : '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const payload = {
        userId: data.userId,
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
        roleForShift: data.roleForShift || null,
        notes: data.notes || null,
      }
      if (isEdit) {
        await api.schedule.update(initial.id, { ...payload, status: initial.status })
      } else {
        await api.schedule.create(payload)
      }
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('schedule.errors.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!isEdit) return
    try {
      await api.schedule.delete(initial.id)
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('schedule.errors.saveFailed'))
    }
  }

  const handleCancel = async () => {
    if (!isEdit) return
    try {
      await api.schedule.update(initial.id, {
        userId: initial.userId,
        startAt: initial.startAt,
        endAt: initial.endAt,
        roleForShift: initial.roleForShift,
        notes: initial.notes,
        status: 'Cancelled',
      })
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('schedule.errors.saveFailed'))
    }
  }

  return (
    <Sheet open onClose={onClose} title={isEdit ? t('schedule.editShift') : t('schedule.addShift')} height="tall">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11.5px] text-fg-3 uppercase font-bold px-1" style={{ letterSpacing: '0.06em' }}>
            {t('schedule.employee')}
          </span>
          <select
            {...register('userId')}
            className="bg-card text-fg rounded-2xl px-4 py-3.5 text-base outline-none border border-line focus:border-accent transition"
            style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
          >
            <option value="">{t('schedule.pickEmployee')}</option>
            {assignable.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.roleName}</option>
            ))}
          </select>
          {errors.userId && <span className="text-danger text-[13px] px-1">{errors.userId.message}</span>}
        </div>

        <Field label={t('schedule.startAt')} type="datetime-local" enterKeyHint="next" {...register('startAt')} error={errors.startAt?.message} />
        <Field label={t('schedule.endAt')}   type="datetime-local" enterKeyHint="next" {...register('endAt')}   error={errors.endAt?.message} />
        <Field label={t('schedule.roleForShift')} enterKeyHint="next" placeholder={t('schedule.roleForShiftPlaceholder')} {...register('roleForShift')} error={errors.roleForShift?.message} />
        <Field label={t('schedule.notes')}        enterKeyHint="done" {...register('notes')} error={errors.notes?.message} />

        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}

        <SubmitButton loading={isSubmitting}>
          {isEdit ? t('schedule.save') : t('schedule.create')}
        </SubmitButton>

        {isEdit && initial.status === 'Scheduled' && (
          <PrimaryButton kind="neutral" type="button" onClick={handleCancel}>
            {t('schedule.cancelShift')}
          </PrimaryButton>
        )}
        {isEdit && !confirmDelete && (
          <PrimaryButton kind="dangerSoft" type="button" onClick={() => setConfirmDelete(true)}>
            {t('schedule.deleteShift')}
          </PrimaryButton>
        )}
        {isEdit && confirmDelete && (
          <PrimaryButton kind="danger" type="button" onClick={handleDelete}>
            {t('schedule.deleteConfirm')}
          </PrimaryButton>
        )}
      </form>
    </Sheet>
  )
}
