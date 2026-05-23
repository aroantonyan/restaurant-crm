import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'

// ---- Category modal ----

interface CategoryFormProps {
  onClose: () => void
  onSaved: () => void
  nextSortOrder: number
}

function CategoryFormModal({ onClose, onSaved, nextSortOrder }: CategoryFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    name: z.string().min(1, { error: t('auth.errors.required') }).max(100, { error: t('auth.errors.tooLong') }),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.menu.createCategory({ name: data.name, sortOrder: nextSortOrder })
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('menu.addCategory')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={t('menu.categoryName')}
            enterKeyHint="done"
            autoFocus
            {...register('name')}
            error={errors.name?.message}
          />
          {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>{t('menu.addCategory')}</SubmitButton>
        </form>
      </div>
    </div>
  )
}

// ---- Main page ----

export default function MenuPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

  const [categories, setCategories] = useState<MenuCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingCategory, setAddingCategory] = useState(false)

  const canManage = perm.has('ManageMenu')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.menu.getAll()
      setCategories(data)
    } catch {
      setError(t('menu.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('menu.title')}</h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium active:scale-[0.98] transition"
          >
            + {t('menu.addCategory')}
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center">
          <p className="text-tg-destructive">{error}</p>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
            {t('common.retry')}
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">📋</div>
          <p className="text-tg-text font-medium">{t('menu.noCategories')}</p>
          <p className="text-tg-hint text-sm">{t('menu.noCategoriesHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {categories.map(cat => {
            const total = cat.items.length
            const unavailable = cat.items.filter(i => !i.isAvailable).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(`/menu/categories/${cat.id}`)}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
              >
                <div className="w-11 h-11 shrink-0 rounded-xl bg-tg-bg flex items-center justify-center text-xl">
                  {pickEmoji(cat.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-tg-text truncate">{cat.name}</p>
                  <p className="text-xs text-tg-hint mt-0.5">
                    {t('menu.itemCount', { count: total })}
                    {unavailable > 0 && (
                      <span className="ml-2 text-tg-destructive">
                        · {t('menu.unavailableCount', { count: unavailable })}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-tg-hint text-xl shrink-0">›</span>
              </button>
            )
          })}
        </div>
      )}

      {addingCategory && (
        <CategoryFormModal
          onClose={() => setAddingCategory(false)}
          onSaved={() => { setAddingCategory(false); load() }}
          nextSortOrder={categories.length + 1}
        />
      )}
    </main>
  )
}

// Heuristic — guesses a fitting emoji from a category name. Falls back to generic plate.
function pickEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('appet') || n.includes('starter')) return '🥗'
  if (n.includes('soup')) return '🍲'
  if (n.includes('main') || n.includes('grill') || n.includes('meat')) return '🍖'
  if (n.includes('salad')) return '🥬'
  if (n.includes('drink') || n.includes('beverage')) return '🥤'
  if (n.includes('wine') || n.includes('cocktail') || n.includes('bar')) return '🍷'
  if (n.includes('beer')) return '🍺'
  if (n.includes('coffee') || n.includes('tea')) return '☕'
  if (n.includes('dessert') || n.includes('sweet')) return '🍰'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('pasta') || n.includes('noodle')) return '🍝'
  if (n.includes('burger')) return '🍔'
  if (n.includes('seafood') || n.includes('fish')) return '🐟'
  if (n.includes('breakfast')) return '🍳'
  if (n.includes('bread')) return '🥖'
  return '🍽️'
}
