interface BackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(fn: () => void): void
  offClick(fn: () => void): void
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
  }
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  onEvent(event: string, fn: () => void): void
  offEvent(event: string, fn: () => void): void
  BackButton?: BackButton
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function initTelegram(): void {
  const tg = getTelegram()
  if (!tg) return

  tg.ready()
  tg.expand()
  tg.disableVerticalSwipes?.()
  applyTheme(tg)
}

function applyTheme(tg: TelegramWebApp): void {
  const root = document.documentElement
  for (const [k, v] of Object.entries(tg.themeParams)) {
    root.style.setProperty(`--tg-theme-${k.replace(/_/g, '-')}`, v)
  }
  document.body.dataset.theme = tg.colorScheme
}
