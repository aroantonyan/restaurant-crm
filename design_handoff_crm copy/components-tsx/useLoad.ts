import { useEffect, useState } from 'react'

/**
 * Skeleton flash: show loading placeholders for a minimum duration so the swap
 * doesn't feel jarring on fast networks.
 *
 *   const loading = useLoad([orderId])  // resets when orderId changes
 *
 *   if (loading) return <SkeletonRow />…
 *
 * In real pages you typically already have a `loading` boolean from your fetch
 * (TablesPage, OrdersPage etc.). Wire that boolean instead:
 *
 *   const [loading, setLoading] = useState(true)
 *   useEffect(() => { setLoading(true); api.x.get().then(...).finally(() => setLoading(false)) }, [deps])
 *
 * Only use this hook for screens with mock/cached data, where you still want
 * the skeleton to flash so users perceive freshness.
 */
export function useLoad(deps: unknown[] = [], delay = 500) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return loading
}
