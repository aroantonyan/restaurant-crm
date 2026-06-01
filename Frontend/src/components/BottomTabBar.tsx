import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { House, ReceiptText, BookOpen, Armchair, type LucideIcon } from 'lucide-react'
import { getTelegram } from '../lib/telegram'

interface Tab {
  key: string
  labelKey: string
  path: string
  icon: LucideIcon
  /** Sub-routes that should keep this tab lit. */
  match: (path: string) => boolean
}

/**
 * Four primary destinations. Home stays first because it is the launcher for
 * every secondary section (cash, reports, staff, …) that the bar can't hold —
 * making it the genuine navigation root. The remaining three are the live
 * service loop a server touches all shift: Orders, Menu, Tables.
 */
const TABS: readonly Tab[] = [
  { key: 'home',   labelKey: 'dashboard.tabs.home',   path: '/dashboard', icon: House,       match: p => p.startsWith('/dashboard') },
  { key: 'orders', labelKey: 'dashboard.tabs.orders', path: '/orders',    icon: ReceiptText, match: p => p.startsWith('/orders') },
  { key: 'menu',   labelKey: 'dashboard.tabs.menu',   path: '/menu',      icon: BookOpen,    match: p => p.startsWith('/menu') },
  { key: 'tables', labelKey: 'dashboard.tabs.tables', path: '/tables',    icon: Armchair,    match: p => p.startsWith('/tables') },
]

export default function BottomTabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const go = (path: string) => {
    if (pathname === path) return
    getTelegram()?.HapticFeedback?.impactOccurred('light')
    navigate(path)
  }

  return (
    <nav
      className="flex-shrink-0 flex px-2 pt-1.5 border-t border-line"
      style={{
        background: 'var(--color-bar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // Respect the iPhone home-indicator safe area; 12px fallback elsewhere.
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map(tab => {
        const active = tab.match(pathname)
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => go(tab.path)}
            aria-label={t(tab.labelKey)}
            aria-current={active ? 'page' : undefined}
            className="flex-1 min-h-[52px] border-0 bg-transparent flex flex-col items-center gap-1 pt-1.5 pb-1 tappable"
          >
            <span
              className={`flex items-center justify-center w-14 h-7 rounded-full transition-colors duration-150
                ${active ? 'bg-accent-soft text-accent' : 'text-fg-3'}`}
            >
              <Icon size={23} strokeWidth={active ? 2.4 : 2} absoluteStrokeWidth aria-hidden />
            </span>
            <span
              className={`text-[11px] leading-none transition-colors duration-150
                ${active ? 'text-accent font-bold' : 'text-fg-3 font-semibold'}`}
              style={{ letterSpacing: '-0.005em' }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
