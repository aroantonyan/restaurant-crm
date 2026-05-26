import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ReportSummaryDto, type TopItemDto, type TopServerDto, type RevenuePointDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useBackButton } from '../hooks/useBackButton'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'

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

export default function ReportsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const canView = perm.has('ViewReports')

  const [rangeKey, setRangeKey]       = useState<RangeKey>('today')
  const [summary, setSummary]         = useState<ReportSummaryDto | null>(null)
  const [topItems, setTopItems]       = useState<TopItemDto[]>([])
  const [topServers, setTopServers]   = useState<TopServerDto[]>([])
  const [trend, setTrend]             = useState<RevenuePointDto[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const range   = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const fromIso = range.from.toISOString()
  const toIso   = range.to.toISOString()
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
      setSummary(s); setTopItems(items); setTopServers(servers); setTrend(t7)
    } catch {
      setError(t('reports.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [fromIso, toIso, showTrend])
  useRealtimeEvent('orderChanged', () => { load() })

  if (!canView) return <Navigate to="/dashboard" replace />

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
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
        <div className="px-5 flex flex-col gap-5">
          {/* Headline revenue card */}
          <div
            className="bg-card rounded-[20px] py-4 px-4.5"
            style={{
              boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
              padding: '16px 18px',
            }}
          >
            <p className="m-0 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
              {t('reports.kpi.revenue')}
            </p>
            <p className="m-0 mt-1 text-[28px] font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.025em' }}>
              {loading ? '—' : formatPrice(summary?.revenue ?? 0)}
            </p>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-2">
            <Kpi label={t('reports.kpi.orders')}    value={loading ? '—' : String(summary?.orderCount ?? 0)} />
            <Kpi label={t('reports.kpi.avgTicket')} value={loading ? '—' : formatPrice(summary?.averageTicket ?? 0)} />
            <Kpi label={t('reports.kpi.itemsSold')} value={loading ? '—' : String(summary?.itemsSold ?? 0)} />
          </div>

          {showTrend && (
            <Section title={t('reports.section.trend')}>
              {loading ? (
                <div className="h-32 rounded-[18px] bg-card animate-pulse"
                     style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
              ) : (
                <RevenueTrendChart points={trend} />
              )}
            </Section>
          )}

          <Section title={t('reports.section.topItems')}>
            {loading ? (
              <SkeletonRows />
            ) : topItems.length === 0 ? (
              <Empty text={t('reports.empty')} />
            ) : (
              <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                {topItems.map((item, idx) => (
                  <li
                    key={item.menuItemId}
                    className="bg-card rounded-[18px] py-3 px-3.5 flex items-center gap-3"
                    style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
                  >
                    <span className="w-7 text-fg-3 text-sm font-bold tabular-nums">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-sm font-semibold truncate">{item.name}</p>
                      <p className="m-0 mt-0.5 text-xs text-fg-3">{t('reports.qty', { count: item.quantity })}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0">{formatPrice(item.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('reports.section.topServers')}>
            {loading ? (
              <SkeletonRows />
            ) : topServers.length === 0 ? (
              <Empty text={t('reports.empty')} />
            ) : (
              <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                {topServers.map((srv, idx) => (
                  <li
                    key={srv.userId}
                    className="bg-card rounded-[18px] py-3 px-3.5 flex items-center gap-3"
                    style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
                  >
                    <span className="w-7 text-fg-3 text-sm font-bold tabular-nums">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-sm font-semibold truncate">{srv.name}</p>
                      <p className="m-0 mt-0.5 text-xs text-fg-3">{t('reports.orderCount', { count: srv.orderCount })}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0">{formatPrice(srv.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </main>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl px-3 py-3"
         style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
      <p className="m-0 text-[10px] font-bold uppercase text-fg-3 truncate" style={{ letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p className="m-0 mt-1 text-base font-bold tabular-nums text-fg truncate"
         style={{ letterSpacing: '-0.01em' }}>
        {value}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="m-0 mb-2 px-1 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
        {title}
      </p>
      {children}
    </section>
  )
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-12 rounded-[18px] bg-card animate-pulse"
             style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-[18px] bg-card"
         style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
      <p className="m-0 text-xs text-fg-3">{text}</p>
    </div>
  )
}

function RevenueTrendChart({ points }: { points: RevenuePointDto[] }) {
  if (points.length === 0) return <Empty text="—" />
  const max = Math.max(...points.map(p => p.revenue), 1)
  return (
    <div className="px-3.5 py-3 rounded-[18px] bg-card"
         style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
      <div className="flex items-end gap-1.5 h-28">
        {points.map(p => {
          const heightPct = Math.max(2, (p.revenue / max) * 100)
          return (
            <div key={p.date} className="flex-1 flex flex-col justify-end" title={`${p.date}: ${p.revenue}`}>
              <div className="bg-accent rounded-t" style={{ height: `${heightPct}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-fg-3 tabular-nums">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
