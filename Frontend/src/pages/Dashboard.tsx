import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/auth'
import { getTelegram } from '../lib/telegram'
import { usePermissions, type Permission } from '../hooks/usePermissions'

interface NavItem {
  key: string
  permission: Permission
  labelKey: string
  descKey: string
  path: string
  icon: string
}

const NAV_CONFIG: readonly NavItem[] = [
  { key: 'orders',    permission: 'ViewOrders'                as Permission, labelKey: 'dashboard.tabs.orders',             descKey: 'dashboard.desc.orders',    path: '/orders',   icon: '📝' },
  { key: 'menu',      permission: 'ViewMenu'                  as Permission, labelKey: 'dashboard.tabs.menu',               descKey: 'dashboard.desc.menu',      path: '/menu',     icon: '🍽️' },
  { key: 'staff',     permission: 'ViewStaff'                 as Permission, labelKey: 'dashboard.tabs.staff',              descKey: 'dashboard.desc.staff',     path: '/staff',    icon: '👥' },
  { key: 'schedule',  permission: 'ViewSchedules'             as Permission, labelKey: 'dashboard.tabs.schedule',           descKey: 'dashboard.desc.schedule',  path: '/schedule', icon: '📅' },
  { key: 'rsettings', permission: 'ManageRestaurantSettings'  as Permission, labelKey: 'dashboard.tabs.restaurantSettings', descKey: 'dashboard.desc.settings',  path: '/settings', icon: '⚙️' },
]

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

  const visibleNav = NAV_CONFIG.filter(item => perm.has(item.permission))

  const handleLogout = () => {
    auth.clear()
    getTelegram()?.HapticFeedback?.impactOccurred('light')
    navigate('/login', { replace: true })
  }

  if (!session) return null

  const initial = (session.firstName?.[0] ?? '?').toUpperCase()

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      {/* header — avatar + name + role/restaurant + gear, all in one row */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 shrink-0 rounded-full bg-tg-button text-tg-button-text flex items-center justify-center font-semibold text-base">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-tg-text truncate">
              {t('dashboard.greeting', { name: session.firstName })}
            </h1>
            <p className="text-sm text-tg-hint truncate">
              <span className="text-tg-text font-medium">{session.roleName}</span>
              <span className="mx-1.5">·</span>
              {session.restaurantName}
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint active:scale-[0.95] transition"
            aria-label={t('common.accountMenu')}
          >
            <GearIcon />
          </button>

          {menuOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          )}

          <div
            className={`absolute top-full right-0 mt-2 z-50 w-56 rounded-2xl bg-tg-bg shadow-2xl overflow-hidden border border-tg-secondary-bg
              transition-all duration-200 ease-out origin-top-right
              ${menuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
          >
            {/* language selector */}
            <div className="px-4 pt-3.5 pb-3">
              <p className="text-[11px] text-tg-hint uppercase tracking-wider mb-2 font-medium">
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
                        ? 'bg-tg-button text-tg-button-text'
                        : 'bg-tg-secondary-bg text-tg-hint'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-tg-secondary-bg" />

            {/* logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-3.5 text-sm font-medium text-tg-destructive text-left active:bg-tg-secondary-bg transition flex items-center gap-2.5"
            >
              <span>↩</span>
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* nav cards */}
      <nav className="flex flex-col gap-2.5 mt-7">
        {visibleNav.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
          >
            <span className="text-2xl shrink-0 w-9 text-center" aria-hidden>{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-tg-text">{t(item.labelKey)}</p>
              <p className="text-xs text-tg-hint mt-0.5 truncate">{t(item.descKey)}</p>
            </div>
            <span className="text-tg-hint text-xl leading-none shrink-0">›</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
