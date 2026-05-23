import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ActivityCategory, type ActivityLogEntryDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'

type RangeKey = 'today' | 'yesterday' | '7d' | '30d'

interface Range { from: Date; to: Date }

function rangeFor(key: RangeKey): Range {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today': {
      const t = new Date(startOfToday); t.setDate(t.getDate() + 1)
      return { from: startOfToday, to: t }
    }
    case 'yesterday': {
      const y = new Date(startOfToday); y.setDate(y.getDate() - 1)
      return { from: y, to: startOfToday }
    }
    case '7d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 6)
      const t = new Date(startOfToday); t.setDate(t.getDate() + 1)
      return { from: s, to: t }
    }
    case '30d': {
      const s = new Date(startOfToday); s.setDate(s.getDate() - 29)
      const t = new Date(startOfToday); t.setDate(t.getDate() + 1)
      return { from: s, to: t }
    }
  }
}

// Category → color for the row marker. Categories that touch money use red/amber
// so they stand out in the timeline at a glance.
const CATEGORY_STYLES: Record<ActivityCategory, { dot: string; text: string }> = {
  Auth:         { dot: 'bg-blue-500',    text: 'text-blue-600'    },
  Order:        { dot: 'bg-green-500',   text: 'text-green-600'   },
  Menu:         { dot: 'bg-purple-500',  text: 'text-purple-600'  },
  Inventory:    { dot: 'bg-orange-500',  text: 'text-orange-600'  },
  Table:        { dot: 'bg-gray-500',    text: 'text-gray-600'    },
  Reservation:  { dot: 'bg-pink-500',    text: 'text-pink-600'    },
  Staff:        { dot: 'bg-red-500',     text: 'text-red-600'     },
  Role:         { dot: 'bg-red-500',     text: 'text-red-600'     },
  Client:       { dot: 'bg-teal-500',    text: 'text-teal-600'    },
  CashRegister: { dot: 'bg-amber-500',   text: 'text-amber-600'   },
  Settings:     { dot: 'bg-indigo-500',  text: 'text-indigo-600'  },
  Security:     { dot: 'bg-red-700',     text: 'text-red-700'     },
}

const CATEGORIES: ActivityCategory[] = [
  'Auth', 'Order', 'Menu', 'Inventory', 'Client', 'CashRegister',
  'Staff', 'Role', 'Reservation', 'Table', 'Settings', 'Security',
]

export default function ActivityLogPage() {
  const { t } = useTranslation()
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
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t('activityLog.title')}</h1>
        <p className="text-tg-hint text-sm mt-1">{t('activityLog.subtitle')}</p>
      </header>

      {/* Range chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
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

      {/* Category chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={[
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
            category === null ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
          ].join(' ')}
        >
          {t('activityLog.allCategories')}
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={[
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition',
              category === c ? 'bg-tg-button text-tg-button-text' : 'bg-tg-secondary-bg text-tg-hint',
            ].join(' ')}
          >
            {t(`activityLog.category.${c}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-tg-destructive text-sm">{error}</p>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
            {t('common.retry')}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-12 px-6 text-center">
          <p className="text-tg-text font-medium">{t('activityLog.empty')}</p>
          <p className="text-tg-hint text-sm mt-1">{t('activityLog.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(e => {
            const style = CATEGORY_STYLES[e.category]
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg">
                <span className={`w-2 h-2 rounded-full shrink-0 mt-2 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className={`font-semibold ${style.text}`}>{t(`activityLog.category.${e.category}`)}</span>
                    <span className="text-tg-hint"> · {e.action}</span>
                  </p>
                  <p className="text-sm text-tg-text mt-0.5 break-words">{e.description}</p>
                  <p className="text-[11px] text-tg-hint mt-1">
                    {new Date(e.createdAt).toLocaleString()}
                    <span className="mx-1">·</span>
                    {e.userName}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
