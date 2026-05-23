import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ReportSummaryDto, type TopItemDto, type TopServerDto, type RevenuePointDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'

// Half-open [from, to) range. `to` is exclusive — matches the backend convention.
type RangeKey = 'today' | 'yesterday' | '7d' | '30d'

interface Range {
  from: Date
  to: Date
}

function rangeFor(key: RangeKey): Range {
  const now = new Date()
  // Start of today in the user's local timezone, in UTC at midnight local.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (key) {
    case 'today': {
      const tomorrow = new Date(startOfToday)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: startOfToday, to: tomorrow }
    }
    case 'yesterday': {
      const yesterday = new Date(startOfToday)
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: yesterday, to: startOfToday }
    }
    case '7d': {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 6) // last 7 days including today
      const tomorrow = new Date(startOfToday)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: start, to: tomorrow }
    }
    case '30d': {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 29)
      const tomorrow = new Date(startOfToday)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: start, to: tomorrow }
    }
  }
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const canView = perm.has('ViewReports')

  const [rangeKey, setRangeKey] = useState<RangeKey>('today')
  const [summary, setSummary] = useState<ReportSummaryDto | null>(null)
  const [topItems, setTopItems] = useState<TopItemDto[]>([])
  const [topServers, setTopServers] = useState<TopServerDto[]>([])
  const [trend, setTrend] = useState<RevenuePointDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()

  // Show trend only for multi-day ranges (one bar isn't a chart).
  const showTrend = rangeKey === '7d' || rangeKey === '30d'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, items, servers, t7] = await Promise.all([
        api.reports.summary(fromIso, toIso),
        api.reports.topItems(fromIso, toIso, 5),
        api.reports.topServers(fromIso, toIso, 5),
        showTrend ? api.reports.revenueTrend(fromIso, toIso) : Promise.resolve([]),
      ])
      setSummary(s)
      setTopItems(items)
      setTopServers(servers)
      setTrend(t7)
    } catch {
      setError(t('reports.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [fromIso, toIso, showTrend])

  // Live: refresh as orders close/pay during the day.
  useRealtimeEvent('orderChanged', () => { load() })

  if (!canView) return <Navigate to="/dashboard" replace />

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <p className="text-tg-hint text-sm mt-1">{t('reports.subtitle')}</p>
      </header>

      {/* Range chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden">
        {(['today', 'yesterday', '7d', '30d'] as RangeKey[]).map(k => {
          const active = rangeKey === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setRangeKey(k)}
              className={[
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition',
                active
                  ? 'bg-tg-button text-tg-button-text'
                  : 'bg-tg-secondary-bg text-tg-hint',
              ].join(' ')}
            >
              {t(`reports.range.${k}`)}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-tg-destructive text-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <Kpi label={t('reports.kpi.revenue')} value={loading ? '—' : formatPrice(summary?.revenue ?? 0)} />
            <Kpi label={t('reports.kpi.orders')} value={loading ? '—' : String(summary?.orderCount ?? 0)} />
            <Kpi label={t('reports.kpi.avgTicket')} value={loading ? '—' : formatPrice(summary?.averageTicket ?? 0)} />
            <Kpi label={t('reports.kpi.itemsSold')} value={loading ? '—' : String(summary?.itemsSold ?? 0)} />
          </div>

          {/* Revenue trend — only multi-day ranges */}
          {showTrend && (
            <Section title={t('reports.section.trend')}>
              {loading ? (
                <div className="h-32 rounded-2xl bg-tg-secondary-bg animate-pulse" />
              ) : (
                <RevenueTrendChart points={trend} />
              )}
            </Section>
          )}

          {/* Top items */}
          <Section title={t('reports.section.topItems')}>
            {loading ? (
              <SkeletonRows />
            ) : topItems.length === 0 ? (
              <Empty text={t('reports.empty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {topItems.map((item, idx) => (
                  <li key={item.menuItemId} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg">
                    <span className="w-6 text-tg-hint text-sm font-semibold tabular-nums">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-tg-hint">{t('reports.qty', { count: item.quantity })}</p>
                    </div>
                    <span className="text-sm font-semibold text-tg-text shrink-0">{formatPrice(item.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Top servers */}
          <Section title={t('reports.section.topServers')}>
            {loading ? (
              <SkeletonRows />
            ) : topServers.length === 0 ? (
              <Empty text={t('reports.empty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {topServers.map((srv, idx) => (
                  <li key={srv.userId} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg">
                    <span className="w-6 text-tg-hint text-sm font-semibold tabular-nums">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{srv.name}</p>
                      <p className="text-xs text-tg-hint">{t('reports.orderCount', { count: srv.orderCount })}</p>
                    </div>
                    <span className="text-sm font-semibold text-tg-text shrink-0">{formatPrice(srv.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </main>
  )
}

// ---- Subcomponents ----

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-2xl bg-tg-secondary-bg">
      <p className="text-[11px] text-tg-hint uppercase tracking-wide font-medium">{label}</p>
      <p className="text-lg font-bold mt-1 truncate">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-xs text-tg-hint uppercase tracking-wider font-medium mb-2 px-1">{title}</h2>
      {children}
    </section>
  )
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded-2xl bg-tg-secondary-bg animate-pulse" />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-2xl bg-tg-secondary-bg">
      <p className="text-xs text-tg-hint">{text}</p>
    </div>
  )
}

// Simple div-based bar chart. No chart library — keeps the bundle lean and
// avoids cross-platform sizing quirks inside the Telegram WebView.
function RevenueTrendChart({ points }: { points: RevenuePointDto[] }) {
  if (points.length === 0) return <Empty text="—" />
  const max = Math.max(...points.map(p => p.revenue), 1)
  return (
    <div className="px-3 py-3 rounded-2xl bg-tg-secondary-bg">
      <div className="flex items-end gap-1.5 h-28">
        {points.map(p => {
          const heightPct = Math.max(2, (p.revenue / max) * 100)
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col justify-end"
              title={`${p.date}: ${p.revenue}`}
            >
              <div
                className="bg-tg-button rounded-t"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-tg-hint tabular-nums">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}

function shortDate(iso: string): string {
  // "2026-05-19" → "May 19"
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
