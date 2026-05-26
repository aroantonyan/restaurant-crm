import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/auth'
import { disconnectRealtime } from '../lib/realtime'
import { getTelegram } from '../lib/telegram'
import { usePermissions, type Permission } from '../hooks/usePermissions'
import Portal from '../components/Portal'

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
 * Snapshot values are placeholders for now — wiring them to live counts is
 * a separate task and would require new API endpoints. We keep the visual
 * shape and the i18n labels so the swap-in is trivial later.
 */

type Tint = 'orange' | 'green' | 'blue' | 'plum'

interface TodayItem {
  key: string
  permission: Permission
  labelKey: string
  descKey: string
  path: string
  icon: string
  tint: Tint
}

interface MoreItem {
  key: string
  permission: Permission
  labelKey: string
  path: string
  icon: string
}

const TODAY: readonly TodayItem[] = [
  { key: 'orders', permission: 'ViewOrders'           as Permission, labelKey: 'dashboard.tabs.orders',       descKey: 'dashboard.desc.orders',       path: '/orders',       icon: '📝', tint: 'orange' },
  { key: 'menu',   permission: 'ViewMenu'             as Permission, labelKey: 'dashboard.tabs.menu',         descKey: 'dashboard.desc.menu',         path: '/menu',         icon: '🍽️', tint: 'green'  },
  { key: 'tables', permission: 'ViewTables'           as Permission, labelKey: 'dashboard.tabs.tables',       descKey: 'dashboard.desc.tables',       path: '/tables',       icon: '🪑', tint: 'blue'   },
  { key: 'reserv', permission: 'ViewReservations'     as Permission, labelKey: 'dashboard.tabs.reservations', descKey: 'dashboard.desc.reservations', path: '/reservations', icon: '📅', tint: 'plum'   },
]

const MORE: readonly MoreItem[] = [
  { key: 'cash',     permission: 'ViewCashRegister'         as Permission, labelKey: 'dashboard.tabs.cash',               path: '/cash-register',  icon: '💵' },
  { key: 'reports',  permission: 'ViewReports'              as Permission, labelKey: 'dashboard.tabs.reports',            path: '/reports',        icon: '📊' },
  { key: 'stock',    permission: 'ViewWarehouse'            as Permission, labelKey: 'dashboard.tabs.warehouse',          path: '/warehouse',      icon: '📦' },
  { key: 'clients',  permission: 'ViewClients'              as Permission, labelKey: 'dashboard.tabs.clients',            path: '/clients',        icon: '👤' },
  { key: 'staff',    permission: 'ViewStaff'                as Permission, labelKey: 'dashboard.tabs.staff',              path: '/staff',          icon: '👥' },
  { key: 'schedule', permission: 'ViewSchedules'            as Permission, labelKey: 'dashboard.tabs.schedule',           path: '/schedule',       icon: '🗓️' },
  { key: 'settings', permission: 'ManageRestaurantSettings' as Permission, labelKey: 'dashboard.tabs.restaurantSettings', path: '/settings',       icon: '⚙️' },
  { key: 'audit',    permission: 'ViewActivityLog'          as Permission, labelKey: 'dashboard.tabs.activityLog',        path: '/activity-log',   icon: '🔍' },
]

const TINT_BG: Record<Tint, string> = {
  orange: 'bg-accent-soft',
  green:  'bg-ok-soft',
  blue:   'bg-info-soft',
  plum:   'bg-[#F2E7F1]',
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

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={t('common.accountMenu')}
              className="w-10 h-10 rounded-full bg-[rgba(15,15,16,0.05)] text-fg-2 flex items-center justify-center tappable"
            >
              <GearIcon />
            </button>

            {menuOpen && (
              <Portal>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              </Portal>
            )}

            <div
              className={`absolute top-full right-0 mt-2 z-50 w-56 rounded-2xl bg-card overflow-hidden border border-line
                transition-all duration-200 ease-out origin-top-right
                ${menuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
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
                      onClick={() => i18n.changeLanguage(code)}
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
                <span>↩</span>
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>

        {/* Live snapshot card — three KPIs separated by vertical dividers.
            Values are placeholders until backend KPI endpoints are added. */}
        <div className="item-enter mt-4 p-3.5 rounded-[18px] bg-card flex"
             style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
          <SnapStat label={t('dashboard.snapshot.openOrders')}   value="—" tone="info"  />
          <SnapDivider />
          <SnapStat label={t('dashboard.snapshot.todayRevenue')} value="—" tone="ok"    />
          <SnapDivider />
          <SnapStat label={t('dashboard.snapshot.tablesFree')}   value="—" tone="muted" />
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
                  <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[18px] shrink-0 ${TINT_BG[it.tint]}`}>
                    {it.icon}
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
                  <span className="text-[22px]" aria-hidden>{it.icon}</span>
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

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
