import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ProductDto, type ProductUnit, type RecipeDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { getTelegram } from '../../lib/telegram'
import { formatQuantity } from '../../lib/format'
import Portal from '../../components/Portal'
import StickyActions from '../../components/StickyActions'
import PrimaryButton from '../../components/PrimaryButton'
import { Plus } from 'lucide-react'

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
      <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
        <div className="h-7 w-40 bg-card rounded animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-card animate-pulse" />)}
        </div>
      </main>
    )
  }

  return (
    <div className="relative h-full overflow-hidden">
      <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-32">
        <header className="mb-2">
          <h1 className="text-2xl font-bold">{t('recipe.title')}</h1>
          <p className="text-fg-3 text-sm mt-0.5 truncate">{recipe?.menuItemName}</p>
        </header>
        <p className="text-fg-3 text-xs mb-5">{t('recipe.hint')}</p>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-2xl bg-card">
            <p className="text-fg font-medium">{t('recipe.empty')}</p>
            <p className="text-fg-3 text-sm mt-1">{t('recipe.emptyHint')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 m-0 p-0 list-none">
            {rows.map(r => (
              <li key={r.productId} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card">
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-sm font-medium truncate">{r.productName}</p>
                  <p className="m-0 text-[11px] text-fg-3 mt-0.5">{t(`warehouse.units.${r.productUnit}`)}</p>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  value={r.quantity}
                  onChange={e => updateQty(r.productId, parseFloat(e.target.value) || 0)}
                  disabled={!canManage}
                  className="w-20 bg-bg text-fg rounded-xl px-3 py-2 text-base text-right tabular-nums outline-none focus:ring-2 focus:ring-accent"
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeRow(r.productId)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-bg text-danger text-lg leading-none shrink-0 active:scale-95 transition"
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
            className="mt-3 w-full py-3 rounded-2xl bg-card text-fg font-medium tappable border-0 flex items-center justify-center gap-1.5 disabled:opacity-50
              shadow-[0_1px_0_rgba(15,15,16,.04),0_1px_3px_rgba(15,15,16,.05)]"
          >
            <Plus size={17} strokeWidth={2.4} aria-hidden />
            {t('recipe.addIngredient')}
          </button>
        )}
      </main>

      {/* Sticky Save bar — separated from the in-flow "Add ingredient" so the two
          actions never collide, and the primary CTA stays in the thumb zone. */}
      {canManage && (
        <StickyActions hint={error ? <span className="text-danger">{error}</span> : undefined}>
          <PrimaryButton kind="primary" onClick={save} disabled={saving}>
            {saving ? t('common.loading') : t('recipe.save')}
          </PrimaryButton>
        </StickyActions>
      )}

      {/* Ingredient picker — full-height sheet with search */}
      {pickerOpen && (
        <ProductPicker
          products={pickable}
          onPick={addRow}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
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
    <Portal>
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-in" onClick={onClose} style={{ paddingBottom: 'var(--keyboard-offset, 0px)', transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="bg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[85dvh] flex flex-col sheet-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t('recipe.pickProduct')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-fg-3 text-xl leading-none">×</button>
        </div>

        <input
          type="search"
          placeholder={t('recipe.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="bg-card text-fg rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent transition mb-3"
        />

        <ul className="overflow-y-auto flex flex-col gap-2">
          {visible.length === 0 ? (
            <li className="text-fg-3 text-sm text-center py-6">{t('recipe.noResults')}</li>
          ) : visible.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card active:scale-[0.98] transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-fg-3 mt-0.5">
                    {p.category ?? t('warehouse.uncategorized')}
                    <span className="mx-1.5">·</span>
                    {formatQuantity(p.currentStock, p.unit)} {t('recipe.inStock')}
                  </p>
                </div>
                <span className="text-accent text-xl shrink-0">+</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
    </Portal>
  )
}
