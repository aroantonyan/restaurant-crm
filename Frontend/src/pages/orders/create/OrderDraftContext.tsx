import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MenuItemDto, TableDto } from '../../../lib/api'

export interface OrderDraftItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

interface OrderDraft {
  table: TableDto | null
  items: OrderDraftItem[]
  total: number
  totalItemsCount: number
  setTable: (table: TableDto) => void
  /**
   * Insert or replace an item. If quantity ≤ 0 the item is removed.
   * Used by the item modal (qty + notes) and by the +/− affordances.
   */
  upsertItem: (item: OrderDraftItem) => void
  /** Increment quantity by 1 (no notes change). Convenience for quick-add buttons. */
  incrementItem: (item: MenuItemDto) => void
  removeItem: (menuItemId: string) => void
  getItem: (menuItemId: string) => OrderDraftItem | undefined
  getQty: (menuItemId: string) => number
  clear: () => void
}

const OrderDraftCtx = createContext<OrderDraft | null>(null)

export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const [table, setTableState] = useState<TableDto | null>(null)
  const [items, setItems] = useState<OrderDraftItem[]>([])

  const setTable = useCallback((t: TableDto) => setTableState(t), [])

  const upsertItem = useCallback((next: OrderDraftItem) => {
    setItems(prev => {
      if (next.quantity <= 0) {
        return prev.filter(i => i.menuItemId !== next.menuItemId)
      }
      const exists = prev.some(i => i.menuItemId === next.menuItemId)
      if (exists) {
        return prev.map(i => (i.menuItemId === next.menuItemId ? next : i))
      }
      return [...prev, next]
    })
  }, [])

  const incrementItem = useCallback((item: MenuItemDto) => {
    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === item.id)
      if (existing) {
        return prev.map(i =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    setItems(prev => prev.filter(i => i.menuItemId !== menuItemId))
  }, [])

  const getItem = useCallback(
    (menuItemId: string) => items.find(i => i.menuItemId === menuItemId),
    [items]
  )

  const getQty = useCallback(
    (menuItemId: string) => items.find(i => i.menuItemId === menuItemId)?.quantity ?? 0,
    [items]
  )

  const clear = useCallback(() => {
    setTableState(null)
    setItems([])
  }, [])

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  )

  const totalItemsCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  )

  const value: OrderDraft = {
    table, items, total, totalItemsCount,
    setTable, upsertItem, incrementItem, removeItem, getItem, getQty, clear,
  }

  return <OrderDraftCtx.Provider value={value}>{children}</OrderDraftCtx.Provider>
}

export function useOrderDraft(): OrderDraft {
  const ctx = useContext(OrderDraftCtx)
  if (!ctx) throw new Error('useOrderDraft must be used inside <OrderDraftProvider>')
  return ctx
}
