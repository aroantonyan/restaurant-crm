import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type TableDto, type MenuCategoryDto } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'

type Step = 'table' | 'items'

interface OrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

function tableStatusClass(status: string) {
  if (status === 'Free') return 'bg-tg-button text-tg-button-text'
  return 'bg-tg-secondary-bg text-tg-hint'
}

export default function CreateOrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  useBackButton()

  const [step, setStep] = useState<Step>('table')
  const [tables, setTables] = useState<TableDto[]>([])
  const [categories, setCategories] = useState<MenuCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableDto | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [tbls, cats] = await Promise.all([api.tables.getAll(), api.menu.getAll()])
        setTables(tbls)
        setCategories(cats)
      } catch {
        setError(t('orders.errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const addItem = (menuItemId: string, name: string, price: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId)
      if (existing) {
        return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { menuItemId, name, price, quantity: 1 }]
    })
  }

  const removeItem = (menuItemId: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItemId)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter(i => i.menuItemId !== menuItemId)
      return prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const getQty = (menuItemId: string) =>
    items.find(i => i.menuItemId === menuItemId)?.quantity ?? 0

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const handleSubmit = async () => {
    if (!selectedTable || items.length === 0) return
    setSubmitting(true)
    setServerError(null)
    try {
      const order = await api.orders.create({
        tableId: selectedTable.id,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      })
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('orders.errors.saveFailed'))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse mb-3" />
        ))}
      </main>
    )
  }

  if (error) {
    return (
      <main className="page-enter flex flex-col items-center px-5 pt-16 pb-10 max-w-md mx-auto w-full min-h-full">
        <p className="text-tg-destructive">{error}</p>
      </main>
    )
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('orders.new')}</h1>
        <div className="flex gap-2 mt-3">
          <div className={`flex-1 h-1 rounded-full ${step === 'table' || step === 'items' ? 'bg-tg-button' : 'bg-tg-secondary-bg'}`} />
          <div className={`flex-1 h-1 rounded-full ${step === 'items' ? 'bg-tg-button' : 'bg-tg-secondary-bg'}`} />
        </div>
      </header>

      {step === 'table' && (
        <>
          <p className="text-tg-hint text-sm mb-4">{t('orders.selectTable')}</p>
          <div className="grid grid-cols-3 gap-3">
            {tables.map(table => {
              const isFree = table.status === 'Free'
              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={!isFree}
                  onClick={() => {
                    setSelectedTable(table)
                    setStep('items')
                  }}
                  className={`flex flex-col items-center justify-center h-20 rounded-2xl font-semibold transition
                    active:scale-[0.98] ${tableStatusClass(table.status)}
                    ${!isFree ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">{table.number}</span>
                  <span className="text-xs mt-0.5">{t(`tables.status.${table.status}`)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {step === 'items' && selectedTable && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-tg-hint text-sm">{t('orders.selectItems')}</p>
            <button
              type="button"
              onClick={() => setStep('table')}
              className="text-tg-hint text-sm"
            >
              {t('orders.table')} {selectedTable.number} ‹
            </button>
          </div>

          <div className="flex flex-col gap-6 flex-1">
            {categories.map(cat => (
              <section key={cat.id}>
                <h2 className="text-base font-semibold text-tg-hint uppercase tracking-wide mb-3 px-1">{cat.name}</h2>
                <div className="flex flex-col gap-2">
                  {cat.items.filter(i => i.isAvailable).map(item => {
                    const qty = getQty(item.id)
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-tg-text truncate">{item.name}</p>
                          <p className="text-sm text-tg-hint">{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {qty > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-tg-bg text-tg-destructive text-lg font-bold active:scale-[0.98] transition"
                              >
                                −
                              </button>
                              <span className="w-5 text-center text-base font-semibold text-tg-text">{qty}</span>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => addItem(item.id, item.name, item.price)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-tg-button text-tg-button-text text-lg font-bold active:scale-[0.98] transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* sticky footer */}
          {items.length > 0 && (
            <div className="sticky bottom-0 pt-4 mt-4 bg-tg-bg">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm text-tg-hint">{t('orders.total')}</span>
                <span className="text-lg font-bold text-tg-text">{total.toFixed(2)}</span>
              </div>
              {serverError && <p className="text-tg-destructive text-sm text-center mb-2">{serverError}</p>}
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition disabled:opacity-60"
              >
                {submitting ? t('common.loading') : t('orders.new')}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
