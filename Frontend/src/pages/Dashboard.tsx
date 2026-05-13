import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from '../lib/auth'
import { getTelegram } from '../lib/telegram'
import { usePermissions, type Permission } from '../hooks/usePermissions'

const NAV_CONFIG = [
  { key: 'staff',    permission: 'ViewStaff'               as Permission, labelKey: 'dashboard.tabs.staff',              path: '/staff'    },
  { key: 'schedule', permission: 'ViewSchedules'            as Permission, labelKey: 'dashboard.tabs.schedule',           path: '/schedule' },
  { key: 'rsettings',permission: 'ManageRestaurantSettings' as Permission, labelKey: 'dashboard.tabs.restaurantSettings', path: '/settings' },
] as const

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

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">

      {/* header row */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-tg-secondary-bg text-tg-hint active:scale-[0.98] transition"
            aria-label={t('common.accountMenu')}
          >
            <GearIcon />
          </button>

          {/* invisible backdrop — closes menu on outside tap */}
          {menuOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          )}

          {/* dropdown — always mounted so CSS transition plays on close too */}
          <div
            className={`absolute top-full right-0 mt-2 z-50 w-52 rounded-2xl bg-tg-section-bg shadow-xl overflow-hidden
              transition-all duration-200 ease-out origin-top-right
              ${menuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
          >
            {/* language */}
            <div className="px-4 pt-3.5 pb-3">
              <p className="text-[11px] text-tg-hint uppercase tracking-wide mb-2">
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
              className="w-full px-4 py-3.5 text-sm font-medium text-tg-destructive text-left active:bg-tg-secondary-bg transition"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* greeting */}
      <header className="mt-5 mb-8">
        <h1 className="text-xl font-semibold">
          {t('dashboard.greeting', { name: `${session.firstName} ${session.lastName}` })}
        </h1>
        <p className="text-tg-hint text-sm mt-1">
          {t('dashboard.role')}:{' '}
          <span className="text-tg-text font-medium">{session.roleName}</span>
        </p>
      </header>

      {/* nav */}
      <nav className="flex flex-col gap-2">
        {visibleNav.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
          >
            <span className="text-base font-medium text-tg-text">{t(item.labelKey)}</span>
            <span className="text-tg-hint text-lg leading-none">›</span>
          </button>
        ))}
      </nav>

    </main>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
