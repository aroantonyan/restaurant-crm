import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders children directly under `document.body`, escaping any transformed
 * ancestor. Use for modals, sheets, dropdowns, tooltips — anything that uses
 * `position: fixed` and must be anchored to the viewport, not to a page that
 * may be inside `.page-enter` (which leaves `transform: translateY(0)` on the
 * element and per CSS spec turns it into the containing block for fixed
 * descendants).
 *
 * Reference:
 *   https://developer.mozilla.org/en-US/docs/Web/CSS/position#fixed_positioning
 *   "If the value of any of transform, perspective, filter, ... is not none,
 *    the element will be the containing block instead."
 */
export default function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
