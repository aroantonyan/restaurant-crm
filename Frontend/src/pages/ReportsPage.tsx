import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type HourlyPointDto, type ReportSummaryDto, type TopItemDto, type TopServerDto, type RevenuePointDto } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import { formatPrice } from '../lib/format'
import AppHeader from '../components/AppHeader'
import Chip from '../components/Chip'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

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

  const canView = perm.has('ViewReports')

  const [rangeKey, setRangeKey]       = useState<RangeKey>('today')
  const [summary, setSummary]         = useState<ReportSummaryDto | null>(null)
  const [topItems, setTopItems]       = useState<TopItemDto[]>([])
  const [topServers, setTopServers]   = useState<TopServerDto[]>([])
  const [trend, setTrend]             = useState<RevenuePointDto[]>([])
  const [hourly, setHourly]           = useState<HourlyPointDto[]>([])
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
      const [s, items, servers, t7, h] = await Promise.all([
        api.reports.summary(fromIso, toIso),
        api.reports.topItems(fromIso, toIso, 5),
        api.reports.topServers(fromIso, toIso, 5),
        showTrend ? api.reports.revenueTrend(fromIso, toIso) : Promise.resolve([]),
        api.reports.hourlyBreakdown(fromIso, toIso),
      ])
      setSummary(s); setTopItems(items); setTopServers(servers); setTrend(t7); setHourly(h)
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

          {/* Headline revenue card with period-over-period comparison */}
          <div
            className="bg-card rounded-[20px]"
            style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)', padding: '16px 18px' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="m-0 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
                  {t('reports.kpi.revenue')}
                </p>
                <p className="m-0 mt-1 text-[28px] font-bold tabular-nums text-fg" style={{ letterSpacing: '-0.025em' }}>
                  {loading ? '—' : formatPrice(summary?.revenue ?? 0)}
                </p>
              </div>
              {!loading && summary && (
                <ChangePill pct={summary.revenuePctChange} />
              )}
            </div>
          </div>

          {/* KPI tiles with comparison */}
          <div className="grid grid-cols-3 gap-2">
            <Kpi
              label={t('reports.kpi.orders')}
              value={loading ? '—' : String(summary?.orderCount ?? 0)}
              pct={loading ? undefined : summary?.orderCountPctChange ?? undefined}
            />
            <Kpi
              label={t('reports.kpi.avgTicket')}
              value={loading ? '—' : formatPrice(summary?.averageTicket ?? 0)}
            />
            <Kpi
              label={t('reports.kpi.itemsSold')}
              value={loading ? '—' : String(summary?.itemsSold ?? 0)}
            />
          </div>

          {/* Revenue trend (7d / 30d only) */}
          {showTrend && (
            <Section title={t('reports.section.trend')}>
              {loading ? (
                <div className="h-36 rounded-[18px] bg-card animate-pulse"
                     style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
              ) : (
                <RevenueTrendChart points={trend} />
              )}
            </Section>
          )}

          {/* Peak hours heatmap */}
          <Section title={t('reports.section.peakHours')}>
            {loading ? (
              <div className="h-24 rounded-[18px] bg-card animate-pulse"
                   style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
            ) : (
              <PeakHoursHeatmap points={hourly} />
            )}
          </Section>

          {/* Top items */}
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

          {/* Top servers */}
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

// ─── Sub-components ──────────────────────────────────────────────────────────

const CARD_SHADOW = '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)'

/**
 * Period-over-period change badge. Green up-arrow / red down-arrow / grey dash.
 * null = no prior data (grey dash). Shown inline with the revenue figure.
 */
function ChangePill({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) {
    return (
      <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-fg-3 text-[11px] font-semibold">
        <Minus size={11} strokeWidth={2.5} aria-hidden />—
      </span>
    )
  }
  const up = pct >= 0
  return (
    <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold tabular-nums
      ${up ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'}`}>
      {up
        ? <TrendingUp  size={11} strokeWidth={2.5} aria-hidden />
        : <TrendingDown size={11} strokeWidth={2.5} aria-hidden />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function Kpi({ label, value, pct }: { label: string; value: string; pct?: number | null }) {
  return (
    <div className="bg-card rounded-2xl px-3 py-3 flex flex-col gap-1" style={{ boxShadow: CARD_SHADOW }}>
      <p className="m-0 text-[10px] font-bold uppercase text-fg-3 truncate" style={{ letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p className="m-0 text-base font-bold tabular-nums text-fg truncate" style={{ letterSpacing: '-0.01em' }}>
        {value}
      </p>
      {pct !== undefined && (
        <ChangePill pct={pct} />
      )}
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
        <div key={i} className="h-12 rounded-[18px] bg-card animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 rounded-[18px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
      <p className="m-0 text-xs text-fg-3">{text}</p>
    </div>
  )
}

/**
 * Revenue bar chart for multi-day ranges.
 * All bars except the last render in muted tone; the last (most recent) bar
 * is accent-colored. Heights animate smoothly on range change.
 */
function RevenueTrendChart({ points }: { points: RevenuePointDto[] }) {
  if (points.length === 0) return <Empty text="—" />
  const max = Math.max(...points.map(p => p.revenue), 1)
  const lastIdx = points.length - 1
  return (
    <div className="px-3.5 py-3 rounded-[18px] bg-card" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-end gap-1 h-28">
        {points.map((p, idx) => {
          const heightPct = Math.max(2, (p.revenue / max) * 100)
          const isLast = idx === lastIdx
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col justify-end"
              title={`${shortDate(p.date)}: ${formatPrice(p.revenue)} (${p.orderCount} orders)`}
            >
              <div
                className={`rounded-t transition-all duration-[350ms] ease-out ${isLast ? 'bg-accent' : 'bg-muted'}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-fg-3 tabular-nums">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[lastIdx].date)}</span>
      </div>
    </div>
  )
}

/**
 * 24-hour heatmap showing when the restaurant is busiest.
 * Renders as a 6×4 grid (6 rows of 4 hours each). Each cell's intensity
 * (opacity of the accent background) scales with order count relative to
 * the peak hour. The busiest hour gets a full-accent label; zero hours are
 * fully transparent.
 */
function PeakHoursHeatmap({ points }: { points: HourlyPointDto[] }) {
  const maxOrders = Math.max(...points.map(p => p.orderCount), 1)
  const hasAnyOrders = points.some(p => p.orderCount > 0)

  if (!hasAnyOrders) return <Empty text="—" />

  const peakHour = points.reduce((best, p) => p.orderCount > best.orderCount ? p : best, points[0])

  return (
    <div className="rounded-[18px] bg-card px-3.5 py-3.5" style={{ boxShadow: CARD_SHADOW }}>
      <div className="grid grid-cols-6 gap-1.5">
        {points.map(p => {
          const intensity = p.orderCount / maxOrders
          const isPeak = p.hour === peakHour.hour && p.orderCount > 0
          return (
            <div
              key={p.hour}
              className="flex flex-col items-center gap-0.5 rounded-lg py-2"
              style={{
                background: p.orderCount === 0
                  ? 'transparent'
                  : `rgba(217,99,63,${Math.max(0.1, intensity * 0.85)})`,
              }}
              title={`${p.hour}:00 — ${p.orderCount} orders`}
            >
              <span
                className={`text-[10px] font-bold tabular-nums leading-none
                  ${p.orderCount === 0 ? 'text-fg-4' : isPeak ? 'text-white' : intensity > 0.5 ? 'text-white' : 'text-accent-press'}`}
              >
                {p.hour}
              </span>
              {p.orderCount > 0 && (
                <span
                  className={`text-[9px] leading-none tabular-nums
                    ${isPeak || intensity > 0.5 ? 'text-white/70' : 'text-accent-press/70'}`}
                >
                  {p.orderCount}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="m-0 mt-2 text-[10.5px] text-fg-3 text-center">
        Peak: {peakHour.hour}:00 · {peakHour.orderCount} {peakHour.orderCount === 1 ? 'order' : 'orders'}
      </p>
    </div>
  )
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
