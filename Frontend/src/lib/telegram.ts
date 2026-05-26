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

/**
 * Freezes the layout height to `viewportStableHeight` so the on-screen keyboard
 * doesn't shrink the viewport. Without this, opening the keyboard would pull
 * the bottom tab bar up onto the screen. With this in place:
 *   - html / body / #root stay at the stable height
 *   - the keyboard simply overlays the bottom portion
 *   - the focused input scrolls into view above the keyboard (via #root)
 *
 * In a non-Telegram browser (local dev), `tg` is null and the CSS falls back
 * to `height: 100%`, which is fine on desktop where there's no on-screen keyboard.
 */
function syncStableHeight(tg: TelegramWebApp): void {
  const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight
  if (h > 0) {
    document.documentElement.style.setProperty('--tg-stable-height', `${h}px`)
  }
}

/**
 * Track the on-screen keyboard via the `visualViewport` API and write its
 * size to `--keyboard-offset`. Sheets and sticky CTAs read that variable so
 * they always sit above the keyboard, no matter what the layout viewport says.
 *
 * Math: layout viewport height (window.innerHeight, frozen via --tg-stable-height)
 * minus visual viewport height (shrinks when keyboard opens) = keyboard height.
 * `visualViewport.offsetTop` covers the iOS case where the viewport scrolls
 * up rather than resizing.
 */
function syncKeyboardOffset(): void {
  const vv = window.visualViewport
  if (!vv) return
  const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`)
}

export function initTelegram(): void {
  const tg = getTelegram()

  // Keyboard tracking works in any browser, not just inside Telegram.
  syncKeyboardOffset()
  window.visualViewport?.addEventListener('resize', syncKeyboardOffset)
  window.visualViewport?.addEventListener('scroll', syncKeyboardOffset)

  if (!tg) return

  tg.ready()
  tg.expand()
  tg.disableVerticalSwipes?.()

  // Pin the layout height to viewportStableHeight; refresh on chrome resize
  // (e.g. user collapses/expands the Mini App). The keyboard does NOT fire
  // viewportChanged in stable state — that's exactly what we want.
  syncStableHeight(tg)
  tg.onEvent('viewportChanged', () => {
    if (tg.isExpanded) syncStableHeight(tg)
  })

  // applyTheme(tg)  // disabled: we use our own warm-neutral palette now (light mode only)
}

// Kept for reference — re-enable if Telegram theme sync is ever desired again.
// function applyTheme(tg: TelegramWebApp): void {
//   const root = document.documentElement
//   for (const [k, v] of Object.entries(tg.themeParams)) {
//     root.style.setProperty(`--tg-theme-${k.replace(/_/g, '-')}`, v)
//   }
//   document.body.dataset.theme = tg.colorScheme
// }
