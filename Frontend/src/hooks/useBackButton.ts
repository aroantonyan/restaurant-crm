import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTelegram } from '../lib/telegram'

/**
 * Wires Telegram's native BackButton.
 *
 * Pass an explicit `target` path so back always goes to the page's logical parent
 * — never to "the previous URL in history". This avoids the cycling problem when a
 * user navigates A → B → A → B and expects back to go to the parent of A/B,
 * not to whichever sibling they visited last.
 *
 * If `target` is omitted, falls back to `navigate(-1)` (browser-history step back).
 */
export function useBackButton(target?: string) {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    const btn = getTelegram()?.BackButton
    if (!btn) return

    const handler = () => {
      const t = targetRef.current
      if (t) navigateRef.current(t)
      else navigateRef.current(-1)
    }
    btn.show()
    btn.onClick(handler)

    return () => {
      btn.offClick(handler)
      btn.hide()
    }
  }, [])
}
