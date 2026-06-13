import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ClientDto, MenuItemDto, TableDto } from '../../../lib/api'

export interface OrderDraftItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

/** A trimmed client reference held on the draft (id + name is all the cart needs). */
export interface DraftClient {
  id: string
  fullName: string
}

interface OrderDraft {
  table: TableDto | null
  client: DraftClient | null
  // Table number for header context. Derived from `table` on the new-order path;
  // set explicitly in add-mode (where the table isn't in the draft).
  tableNumber: number | null
  items: OrderDraftItem[]
  total: number
  totalItemsCount: number
  setTable: (table: TableDto) => void
  setTableNumber: (n: number) => void
  setClient: (client: ClientDto | DraftClient | null) => void
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
  const [client, setClientState] = useState<DraftClient | null>(null)
  const [tableNumberState, setTableNumberState] = useState<number | null>(null)
  const [items, setItems] = useState<OrderDraftItem[]>([])

  const setTable = useCallback((t: TableDto) => {
    setTableState(t)
    setTableNumberState(t.number)
  }, [])

  const setTableNumber = useCallback((n: number) => setTableNumberState(n), [])

  const setClient = useCallback((c: ClientDto | DraftClient | null) => {
    setClientState(c ? { id: c.id, fullName: c.fullName } : null)
  }, [])

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
    setClientState(null)
    setTableNumberState(null)
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
    table, client, tableNumber: tableNumberState, items, total, totalItemsCount,
    setTable, setTableNumber, setClient, upsertItem, incrementItem, removeItem, getItem, getQty, clear,
  }

  return <OrderDraftCtx.Provider value={value}>{children}</OrderDraftCtx.Provider>
}

export function useOrderDraft(): OrderDraft {
  const ctx = useContext(OrderDraftCtx)
  if (!ctx) throw new Error('useOrderDraft must be used inside <OrderDraftProvider>')
  return ctx
}
