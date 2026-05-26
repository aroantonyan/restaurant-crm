import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { key: 'home',   label: 'Home',   path: '/dashboard', icon: GridIcon },
  { key: 'orders', label: 'Orders', path: '/orders',    icon: ReceiptIcon },
  { key: 'menu',   label: 'Menu',   path: '/menu',      icon: BookIcon },
  { key: 'tables', label: 'Tables', path: '/tables',    icon: TableIcon },
] as const

export default function BottomTabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Which tab is currently active? Map any sub-route back to its tab.
  const activeTab =
    pathname.startsWith('/orders')      ? 'orders' :
    pathname.startsWith('/menu')        ? 'menu'   :
    pathname.startsWith('/tables')      ? 'tables' :
    pathname.startsWith('/dashboard')   ? 'home'   :
    null

  return (
    <nav
      className="flex-shrink-0 flex gap-1 px-2 pt-2 border-t border-line"
      style={{
        background: 'var(--color-bar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // Respect the iPhone home-indicator safe area. Fallback 14px gives a
        // sensible inset on devices without the home indicator (e.g. Android).
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.key
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex-1 border-0 bg-transparent flex flex-col items-center gap-1 py-1 px-1 tappable
              ${isActive ? 'text-accent' : 'text-fg-3'}`}
          >
            <Icon active={isActive} />
            <span
              className="text-[11px] font-semibold leading-none"
              style={{ letterSpacing: '-0.005em' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

interface IconProps { active?: boolean }

/** Slightly heavier stroke on the active tab for visual weight without
 *  needing two glyph variants. */
function strokeW(active?: boolean) { return active ? 2.25 : 1.85 }

function ReceiptIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V3z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </svg>
  )
}
function BookIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
function TableIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW(active)} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <line x1="3" y1="11" x2="21" y2="11" />
      <line x1="12" y1="11" x2="12" y2="19" />
    </svg>
  )
}
function GridIcon({ active }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeW(active)} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
