import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ProductDto, type ProductUnit, type RecipeDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { getTelegram } from '../../lib/telegram'
import { formatQuantity } from '../../lib/format'

// Local working row — what the user sees & edits before pressing Save.
// Includes display fields the server would otherwise have to be re-fetched for.
interface EditableIngredient {
  productId: string
  productName: string
  productUnit: ProductUnit
  quantity: number
}

export default function MenuItemRecipePage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton() // omitting target → falls back to navigate(-1), which is what we want

  const canManage = perm.has('ManageMenu')

  const [recipe, setRecipe] = useState<RecipeDto | null>(null)
  const [products, setProducts] = useState<ProductDto[]>([])
  const [rows, setRows] = useState<EditableIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([api.menu.getRecipe(id), api.products.getAll()])
      .then(([r, ps]) => {
        setRecipe(r)
        setProducts(ps.filter(p => !p.isArchived))
        setRows(r.ingredients.map(i => ({
          productId: i.productId,
          productName: i.productName,
          productUnit: i.productUnit as ProductUnit,
          quantity: i.quantity,
        })))
      })
      .catch(() => setError(t('menu.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [id, t])

  // Pickable products = full catalog minus products already in the recipe.
  const pickable = useMemo(() => {
    const used = new Set(rows.map(r => r.productId))
    return products.filter(p => !used.has(p.id))
  }, [products, rows])

  const addRow = (p: ProductDto) => {
    setRows(prev => [...prev, {
      productId: p.id,
      productName: p.name,
      productUnit: p.unit,
      quantity: 1,
    }])
    setPickerOpen(false)
  }

  const updateQty = (productId: string, qty: number) => {
    setRows(prev => prev.map(r => r.productId === productId ? { ...r, quantity: qty } : r))
  }

  const removeRow = (productId: string) => {
    setRows(prev => prev.filter(r => r.productId !== productId))
  }

  const save = async () => {
    if (!id) return
    // Validate all qtys > 0 client-side; server enforces it again.
    const invalid = rows.find(r => !(r.quantity > 0))
    if (invalid) {
      setError(t('recipe.errors.positiveQty'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      const updated = await api.menu.setRecipe(id, {
        ingredients: rows.map(r => ({ productId: r.productId, quantity: r.quantity })),
      })
      setRecipe(updated)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(-1)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
        <div className="h-7 w-40 bg-tg-secondary-bg rounded animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-tg-secondary-bg animate-pulse" />)}
        </div>
      </main>
    )
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">{t('recipe.title')}</h1>
        <p className="text-tg-hint text-sm mt-0.5 truncate">{recipe?.menuItemName}</p>
      </header>
      <p className="text-tg-hint text-xs mb-5">{t('recipe.hint')}</p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl bg-tg-secondary-bg">
          <p className="text-tg-text font-medium">{t('recipe.empty')}</p>
          <p className="text-tg-hint text-sm mt-1">{t('recipe.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(r => (
            <li key={r.productId} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.productName}</p>
                <p className="text-[11px] text-tg-hint mt-0.5">{t(`warehouse.units.${r.productUnit}`)}</p>
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                value={r.quantity}
                onChange={e => updateQty(r.productId, parseFloat(e.target.value) || 0)}
                disabled={!canManage}
                className="w-20 bg-tg-bg text-tg-text rounded-xl px-3 py-2 text-base text-right tabular-nums outline-none focus:ring-2 focus:ring-tg-button"
              />
              {canManage && (
                <button
                  type="button"
                  onClick={() => removeRow(r.productId)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-bg text-tg-destructive text-lg leading-none shrink-0 active:scale-95 transition"
                  aria-label={t('recipe.remove')}
                >×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={pickable.length === 0}
          className="mt-3 py-3 rounded-xl bg-tg-secondary-bg text-tg-text font-medium active:scale-[0.98] transition disabled:opacity-50"
        >
          + {t('recipe.addIngredient')}
        </button>
      )}

      {error && <p className="text-tg-destructive text-sm text-center mt-3">{error}</p>}

      {canManage && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-5 py-3.5 rounded-xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition disabled:opacity-50"
        >
          {saving ? t('common.loading') : t('recipe.save')}
        </button>
      )}

      {/* Ingredient picker — full-height sheet with search */}
      {pickerOpen && (
        <ProductPicker
          products={pickable}
          onPick={addRow}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </main>
  )
}

// ---- Picker ----

interface PickerProps {
  products: ProductDto[]
  onPick: (p: ProductDto) => void
  onClose: () => void
}

function ProductPicker({ products, onPick, onClose }: PickerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
  }, [products, query])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t('recipe.pickProduct')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>

        <input
          type="search"
          placeholder={t('recipe.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-tg-button transition mb-3"
        />

        <ul className="overflow-y-auto flex flex-col gap-2">
          {visible.length === 0 ? (
            <li className="text-tg-hint text-sm text-center py-6">{t('recipe.noResults')}</li>
          ) : visible.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg active:scale-[0.98] transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-tg-hint mt-0.5">
                    {p.category ?? t('warehouse.uncategorized')}
                    <span className="mx-1.5">·</span>
                    {formatQuantity(p.currentStock, p.unit)} {t('recipe.inStock')}
                  </p>
                </div>
                <span className="text-tg-button text-xl shrink-0">+</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
