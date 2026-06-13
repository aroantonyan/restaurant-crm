/**
 * Track the on-screen keyboard via the `visualViewport` API and write its
 * size to `--keyboard-offset`. Sheets and sticky CTAs read that variable so
 * they always sit above the keyboard, no matter what the layout viewport says.
 *
 * Math: layout viewport height (window.innerHeight) minus visual viewport
 * height (shrinks when the keyboard opens) = keyboard height.
 * `visualViewport.offsetTop` covers the iOS case where the viewport scrolls
 * up rather than resizing.
 */
function syncKeyboardOffset(): void {
  const vv = window.visualViewport
  if (!vv) return
  const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`)
}

/**
 * Freezes the layout height to the current viewport height so the on-screen
 * keyboard doesn't shrink the viewport and pull the bottom tab bar up. The
 * keyboard simply overlays the bottom portion; the focused input scrolls into
 * view above it (via #root, the only scroll container).
 */
function syncStableHeight(): void {
  const h = window.innerHeight
  if (h > 0) {
    document.documentElement.style.setProperty('--app-stable-height', `${h}px`)
  }
}

export function initViewport(): void {
  syncStableHeight()
  syncKeyboardOffset()

  window.visualViewport?.addEventListener('resize', syncKeyboardOffset)
  window.visualViewport?.addEventListener('scroll', syncKeyboardOffset)

  // Re-pin the stable height only on orientation change / browser chrome resize,
  // not when the keyboard opens (that's tracked separately via --keyboard-offset).
  window.addEventListener('orientationchange', syncStableHeight)
}
