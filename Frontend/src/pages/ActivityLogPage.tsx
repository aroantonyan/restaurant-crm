import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ActivityCategory, type ActivityLogEntryDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'
import { SkeletonRow } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { History } from 'lucide-react'

type RangeKey = 'today' | 'yesterday' | '7d' | '30d'

interface Range { from: Date; to: Date }

function rangeFor(key: RangeKey): Range {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today':     { const x = new Date(startOfToday); x.setDate(x.getDate() + 1); return { from: startOfToday, to: x } }
    case 'yesterday': { const y = new Date(startOfToday); y.setDate(y.getDate() - 1); return { from: y, to: startOfToday } }
    case '7d':        { const s = new Date(startOfToday); s.setDate(s.getDate() - 6); const x = new Date(startOfToday); x.setDate(x.getDate() + 1); return { from: s, to: x } }
    case '30d':       { const s = new Date(startOfToday); s.setDate(s.getDate() - 29); const x = new Date(startOfToday); x.setDate(x.getDate() + 1); return { from: s, to: x } }
  }
}

/** Category color — used for the leading dot + the category label text. */
const CATEGORY_DOT: Record<ActivityCategory, string> = {
  Auth:         'bg-info',
  Order:        'bg-ok',
  Menu:         'bg-accent',
  Inventory:    'bg-warn',
  Table:        'bg-fg-3',
  Reservation:  'bg-info',
  Staff:        'bg-danger',
  Role:         'bg-danger',
  Client:       'bg-ok',
  CashRegister: 'bg-warn',
  Settings:     'bg-info',
  Security:     'bg-danger',
}

const CATEGORY_TEXT: Record<ActivityCategory, string> = {
  Auth:         'text-info',
  Order:        'text-ok',
  Menu:         'text-accent-press',
  Inventory:    'text-warn',
  Table:        'text-fg-3',
  Reservation:  'text-info',
  Staff:        'text-danger',
  Role:         'text-danger',
  Client:       'text-ok',
  CashRegister: 'text-warn',
  Settings:     'text-info',
  Security:     'text-danger',
}

const CATEGORIES: ActivityCategory[] = [
  'Auth', 'Order', 'Menu', 'Inventory', 'Client', 'CashRegister',
  'Staff', 'Role', 'Reservation', 'Table', 'Settings', 'Security',
]

export default function ActivityLogPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const canView = perm.has('ViewActivityLog')

  const [rangeKey, setRangeKey] = useState<RangeKey>('today')
  const [category, setCategory] = useState<ActivityCategory | null>(null)
  const [entries, setEntries] = useState<ActivityLogEntryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.activityLog.get({
        from: fromIso,
        to: toIso,
        category: category ?? undefined,
        limit: 200,
      })
      setEntries(data)
    } catch {
      setError(t('activityLog.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [fromIso, toIso, category, t])

  useEffect(() => { load() }, [load])

  if (!canView) return <Navigate to="/dashboard" replace />

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('activityLog.title')}
        subtitle={t('activityLog.subtitle')}
      />

      {/* Range chips */}
      <div className="flex gap-2 px-5 pt-2 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['today', 'yesterday', '7d', '30d'] as RangeKey[]).map(k => (
          <Chip key={k} active={rangeKey === k} onClick={() => setRangeKey(k)}>
            {t(`reports.range.${k}`)}
          </Chip>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <Chip active={category === null} onClick={() => setCategory(null)}>
          {t('activityLog.allCategories')}
        </Chip>
        {CATEGORIES.map(c => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {t(`activityLog.category.${c}`)}
          </Chip>
        ))}
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-[18px] bg-card py-8 text-center"
               style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
            <p className="m-0 text-sm text-danger mb-3">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={History} title={t('activityLog.empty')} hint={t('activityLog.emptyHint')} />
        ) : (
          <ul className="flex flex-col gap-2 m-0 p-0 list-none">
            {entries.map((e, idx) => (
              <li
                key={e.id}
                className="item-enter bg-card rounded-[18px] py-3 px-3.5 flex items-start gap-3"
                style={{
                  animationDelay: `${idx * 25}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${CATEGORY_DOT[e.category]}`} />
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm">
                    <span className={`font-semibold ${CATEGORY_TEXT[e.category]}`}>
                      {t(`activityLog.category.${e.category}`)}
                    </span>
                    <span className="text-fg-3"> · {e.action}</span>
                  </p>
                  <p className="m-0 mt-0.5 text-sm text-fg break-words">{e.description}</p>
                  <p className="m-0 mt-1 text-[11px] text-fg-3">
                    {new Date(e.createdAt).toLocaleString()}
                    <span className="mx-1">·</span>
                    {e.userName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
