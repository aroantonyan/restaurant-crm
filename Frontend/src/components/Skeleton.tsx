import type { CSSProperties } from 'react'

interface SkelProps {
  /** Width — number = px, string = CSS. Default 100%. */
  w?: number | string
  /** Height in px. Default 14. */
  h?: number
  /** Border radius in px. Default 8. */
  r?: number
  style?: CSSProperties
}

/** Single shimmer block. Use to compose skeleton rows shaped like real content. */
export function Skel({ w = '100%', h = 14, r = 8, style }: SkelProps) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

/**
 * Pre-shaped skeleton for a list row card (icon + 2 lines of text).
 * Match the shape your loaded row will have so the swap feels seamless.
 */
export function SkeletonRow() {
  return (
    <div
      className="bg-card rounded-2xl p-4 flex items-center gap-3"
      style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
    >
      <Skel w={44} h={44} r={14} />
      <div className="flex-1 flex flex-col gap-2">
        <Skel w="55%" h={13} />
        <Skel w="38%" h={11} />
      </div>
    </div>
  )
}
