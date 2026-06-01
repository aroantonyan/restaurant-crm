import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/auth'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import { disconnectRealtime } from '../lib/realtime'
import { getTelegram } from '../lib/telegram'
import { usePermissions, type Permission } from '../hooks/usePermissions'
import { useRealtimeEvent } from '../hooks/useRealtimeEvent'
import Portal from '../components/Portal'
import {
  ReceiptText, BookOpen, Armchair, CalendarDays,
  Banknote, ChartColumn, Package, UserRound, UsersRound,
  CalendarClock, Settings, History, LogOut, Settings2,
  type LucideIcon,
} from 'lucide-react'

/**
 * Dashboard — Phase 2 redesign.
 *
 * Layout intent (matches the prototype `ScreenDashboard`):
 *   1. Greeting header (avatar + name/role · restaurant + gear menu).
 *   2. Snapshot card — three KPIs separated by vertical dividers.
 *   3. "Today" — 4 rich rows (Orders, Menu, Tables, Reservations) with
 *      tinted icon tiles + a short description.
 *   4. "More" — 8 compact tiles in a 4-column grid (Cash, Reports, Stock,
 *      Clients, Staff, Schedule, Settings, Activity). Fits on one screen,
 *      no scroll.
 *
 * Snapshot values are computed client-side from the orders + tables endpoints
 * (each guarded by the viewer's permissions) and refresh on realtime events.
 */

type Tint = 'orange' | 'green' | 'blue' | 'plum'

interface Snapshot {
  open: number | null
  revenue: number | null
  free: number | null
  total: number | null
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
}

interface TodayItem {
  key: string
  permission: Permission
  labelKey: string
  descKey: string
  path: string
  icon: LucideIcon
  tint: Tint
}

interface MoreItem {
  key: string
  permission: Permission
  labelKey: string
  path: string
  icon: LucideIcon
}

const TODAY: readonly TodayItem[] = [
  { key: 'orders', permission: 'ViewOrders'           as Permission, labelKey: 'dashboard.tabs.orders',       descKey: 'dashboard.desc.orders',       path: '/orders',       icon: ReceiptText,  tint: 'orange' },
  { key: 'menu',   permission: 'ViewMenu'             as Permission, labelKey: 'dashboard.tabs.menu',         descKey: 'dashboard.desc.menu',         path: '/menu',         icon: BookOpen,     tint: 'green'  },
  { key: 'tables', permission: 'ViewTables'           as Permission, labelKey: 'dashboard.tabs.tables',       descKey: 'dashboard.desc.tables',       path: '/tables',       icon: Armchair,     tint: 'blue'   },
  { key: 'reserv', permission: 'ViewReservations'     as Permission, labelKey: 'dashboard.tabs.reservations', descKey: 'dashboard.desc.reservations', path: '/reservations', icon: CalendarDays, tint: 'plum'   },
]

const MORE: readonly MoreItem[] = [
  { key: 'cash',     permission: 'ViewCashRegister'         as Permission, labelKey: 'dashboard.tabs.cash',               path: '/cash-register',  icon: Banknote },
  { key: 'reports',  permission: 'ViewReports'              as Permission, labelKey: 'dashboard.tabs.reports',            path: '/reports',        icon: ChartColumn },
  { key: 'stock',    permission: 'ViewWarehouse'            as Permission, labelKey: 'dashboard.tabs.warehouse',          path: '/warehouse',      icon: Package },
  { key: 'clients',  permission: 'ViewClients'              as Permission, labelKey: 'dashboard.tabs.clients',            path: '/clients',        icon: UserRound },
  { key: 'staff',    permission: 'ViewStaff'                as Permission, labelKey: 'dashboard.tabs.staff',              path: '/staff',          icon: UsersRound },
  { key: 'schedule', permission: 'ViewSchedules'            as Permission, labelKey: 'dashboard.tabs.schedule',           path: '/schedule',       icon: CalendarClock },
  { key: 'settings', permission: 'ManageRestaurantSettings' as Permission, labelKey: 'dashboard.tabs.restaurantSettings', path: '/settings',       icon: Settings },
  { key: 'audit',    permission: 'ViewActivityLog'          as Permission, labelKey: 'dashboard.tabs.activityLog',        path: '/activity-log',   icon: History },
]

const TINT_BG: Record<Tint, string> = {
  orange: 'bg-accent-soft',
  green:  'bg-ok-soft',
  blue:   'bg-info-soft',
  plum:   'bg-[#F2E7F1]',
}

const TINT_FG: Record<Tint, string> = {
  orange: 'text-accent',
  green:  'text-ok',
  blue:   'text-info',
  plum:   'text-[#9A4E96]',
}

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hy', label: 'ՀԱՅ' },
] as const

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const session = auth.getSession()
  const perm = usePermissions()
  const [menuOpen, setMenuOpen] = useState(false)
  const [snap, setSnap] = useState<Snapshot>({ open: null, revenue: null, free: null, total: null })

  const canViewOrders = perm.has('ViewOrders')
  const canViewTables = perm.has('ViewTables')

  const loadSnapshot = async () => {
    const next: Partial<Snapshot> = {}
    await Promise.all([
      canViewOrders
        ? api.orders.getAll().then((orders) => {
            next.open = orders.filter(o => o.status === 'Open').length
            next.revenue = orders
              .filter(o => o.status === 'Paid' && isToday(o.createdAt))
              .reduce((sum, o) => sum + o.total, 0)
          }).catch(() => {})
        : Promise.resolve(),
      canViewTables
        ? api.tables.getAll().then((tables) => {
            next.total = tables.length
            next.free = tables.filter(t => t.status === 'Free').length
          }).catch(() => {})
        : Promise.resolve(),
    ])
    setSnap(s => ({ ...s, ...next }))
  }

  useEffect(() => { loadSnapshot() }, [])
  useRealtimeEvent('orderChanged', () => { loadSnapshot() })
  useRealtimeEvent('tableChanged', () => { loadSnapshot() })

  const visibleToday = TODAY.filter(it => perm.has(it.permission))
  const visibleMore = MORE.filter(it => perm.has(it.permission))

  const handleLogout = () => {
    auth.clear()
    disconnectRealtime()
    getTelegram()?.HapticFeedback?.impactOccurred('light')
    navigate('/login', { replace: true })
  }

  if (!session) return null

  const initial = (session.firstName?.[0] ?? '?').toUpperCase()

  return (
    <main className="page-enter h-full overflow-y-auto pb-5">
      {/* Greeting header — small top margin only; the Telegram chrome lives
          outside the WebView so we don't need to clear a status bar. */}
      <div className="pt-3 px-5 pb-[18px]">
        <div className="flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-[14px] bg-accent text-white flex items-center justify-center font-bold text-[18px] shrink-0"
               style={{ letterSpacing: '-0.01em' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[17px] font-bold truncate" style={{ letterSpacing: '-0.015em' }}>
              {t('dashboard.greeting', { name: session.firstName })}
            </p>
            <p className="m-0 mt-[2px] text-[13px] text-fg-3 truncate">
              <span className="text-fg-2 font-medium">{session.roleName}</span>
              <span className="mx-1.5">·</span>
              {session.restaurantName}
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={t('common.accountMenu')}
              className="w-10 h-10 rounded-full bg-[rgba(15,15,16,0.05)] text-fg-2 flex items-center justify-center tappable"
            >
              <Settings2 size={18} strokeWidth={2} aria-hidden />
            </button>

            {/* Backdrop + panel both live in the Portal (at <body>) so they share
                one stacking context — the page's .page-enter transform no longer
                traps the panel beneath the backdrop (the old click-swallowing bug). */}
            {menuOpen && (
              <Portal>
                <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(false)} />
                <div
                  className="fixed top-[60px] right-4 z-[101] w-56 rounded-2xl bg-card overflow-hidden border border-line origin-top-right"
                  style={{ boxShadow: '0 10px 24px -8px rgba(15,15,16,.14), 0 1px 3px rgba(15,15,16,.06)' }}
                >
                  <div className="px-4 pt-3.5 pb-3">
                    <p className="text-[11px] text-fg-3 uppercase tracking-wider mb-2 font-semibold">
                      {t('common.language')}
                    </p>
                    <div className="flex gap-2">
                      {LANGS.map(({ code, label }) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => { i18n.changeLanguage(code); setMenuOpen(false) }}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition
                            ${i18n.resolvedLanguage === code
                              ? 'bg-accent text-white'
                              : 'bg-muted text-fg-2'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-line" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-3.5 text-sm font-semibold text-danger text-left active:bg-muted transition flex items-center gap-2.5"
                  >
                    <LogOut size={16} strokeWidth={2.2} aria-hidden />
                    {t('common.logout')}
                  </button>
                </div>
              </Portal>
            )}
          </div>
        </div>

        {/* Live snapshot card — three KPIs separated by vertical dividers.
            Computed client-side from orders + tables, permission-gated; "—"
            until loaded or when the viewer lacks the relevant permission. */}
        <div className="item-enter mt-4 p-3.5 rounded-[18px] bg-card flex"
             style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
          <SnapStat
            label={t('dashboard.snapshot.openOrders')}
            value={snap.open === null ? '—' : String(snap.open)}
            tone="info"
          />
          <SnapDivider />
          <SnapStat
            label={t('dashboard.snapshot.todayRevenue')}
            value={snap.revenue === null ? '—' : formatPrice(snap.revenue)}
            tone="ok"
          />
          <SnapDivider />
          <SnapStat
            label={t('dashboard.snapshot.tablesFree')}
            value={snap.total === null ? '—' : `${snap.free}/${snap.total}`}
            tone="muted"
          />
        </div>
      </div>

      <div className="px-5 flex flex-col gap-[22px]">
        {/* Today — rich rows */}
        {visibleToday.length > 0 && (
          <section>
            <p className="m-0 mb-2.5 text-[11.5px] font-bold uppercase text-fg-3"
               style={{ letterSpacing: '0.06em' }}>
              {t('dashboard.sections.today')}
            </p>
            <div className="flex flex-col gap-2">
              {visibleToday.map((it, idx) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => navigate(it.path)}
                  className="tappable item-enter w-full bg-card border-0 rounded-[18px] flex items-center gap-3 text-left py-[13px] px-3.5"
                  style={{
                    animationDelay: `${idx * 30}ms`,
                    boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 ${TINT_BG[it.tint]} ${TINT_FG[it.tint]}`}>
                    <it.icon size={19} strokeWidth={2.1} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[15px] font-semibold" style={{ letterSpacing: '-0.005em' }}>
                      {t(it.labelKey)}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-fg-3 truncate">
                      {t(it.descKey)}
                    </p>
                  </div>
                  <span className="text-fg-4 shrink-0" aria-hidden>
                    <ChevronIcon />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* More — compact 4-col tile grid */}
        {visibleMore.length > 0 && (
          <section>
            <p className="m-0 mb-2.5 text-[11.5px] font-bold uppercase text-fg-3"
               style={{ letterSpacing: '0.06em' }}>
              {t('dashboard.sections.more')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {visibleMore.map((it, idx) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => navigate(it.path)}
                  className="tappable item-enter bg-card border-0 rounded-2xl flex flex-col items-center gap-1.5 pt-3 px-1.5 pb-2.5"
                  style={{
                    animationDelay: `${(idx + 4) * 30}ms`,
                    boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-fg-2" aria-hidden>
                    <it.icon size={19} strokeWidth={2} />
                  </span>
                  <span className="text-[11.5px] font-semibold text-fg-2 text-center leading-tight"
                        style={{ letterSpacing: '-0.005em' }}>
                    {t(it.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

/* ──────────────────────────────────────────────────────────────── */

type SnapTone = 'info' | 'ok' | 'muted'
const SNAP_VALUE_TONE: Record<SnapTone, string> = {
  info:  'text-info',
  ok:    'text-ok',
  muted: 'text-fg-2',
}

function SnapStat({ label, value, tone }: { label: string; value: string; tone: SnapTone }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 px-1 min-w-0">
      <p className="m-0 text-[10.5px] font-semibold uppercase text-fg-3 truncate"
         style={{ letterSpacing: '0.04em' }}>
        {label}
      </p>
      <p className={`m-0 text-[20px] font-bold tabular-nums ${SNAP_VALUE_TONE[tone]}`}
         style={{ letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

function SnapDivider() {
  return <div className="w-px self-stretch bg-line my-1" />
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
