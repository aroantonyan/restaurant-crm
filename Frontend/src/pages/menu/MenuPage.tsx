import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto, type MenuItemDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'

// ---- Item modal ----

type EditingItem = MenuItemDto | 'new' | null

interface ItemFormProps {
  categories: MenuCategoryDto[]
  item: MenuItemDto | 'new'
  onClose: () => void
  onSaved: () => void
}

function ItemFormModal({ categories, item, onClose, onSaved }: ItemFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    categoryId: z.string().min(1, { error: t('auth.errors.required') }),
    name: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    description: z.string().max(1000, { error: t('auth.errors.tooLong') }).optional(),
    price: z.number({ error: t('auth.errors.required') }).min(0),
    isAvailable: z.boolean(),
  })
  type FormData = z.infer<typeof schema>

  const isNew = item === 'new'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isNew
      ? { categoryId: categories[0]?.id ?? '', name: '', description: '', price: 0, isAvailable: true }
      : { categoryId: item.categoryId, name: item.name, description: item.description ?? '', price: item.price, isAvailable: item.isAvailable },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      if (isNew) {
        await api.menu.createItem({
          categoryId: data.categoryId,
          name: data.name,
          description: data.description || undefined,
          price: data.price,
          isAvailable: data.isAvailable,
        })
      } else {
        await api.menu.updateItem(item.id, {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description || undefined,
          price: data.price,
          isAvailable: data.isAvailable,
        })
      }
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{isNew ? t('menu.addItem') : t('menu.editItem')}</h2>
          <button type="button" onClick={onClose} className="text-tg-hint text-2xl leading-none px-2">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select
            label={t('menu.category')}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            {...register('categoryId')}
            error={errors.categoryId?.message}
          />
          <Field
            label={t('menu.itemName')}
            enterKeyHint="next"
            {...register('name')}
            error={errors.name?.message}
          />
          <Field
            label={t('menu.description')}
            enterKeyHint="next"
            {...register('description')}
            error={errors.description?.message}
          />
          <Field
            label={t('menu.price')}
            type="number"
            inputMode="decimal"
            enterKeyHint="done"
            step="0.01"
            min="0"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
          />
          <label className="flex items-center gap-3 px-1 py-2 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 rounded" {...register('isAvailable')} />
            <span className="text-base text-tg-text">{t('menu.available')}</span>
          </label>

          {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>
            {isNew ? t('menu.addItem') : t('common.submit')}
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}

// ---- Category form modal ----

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
    sortOrder: z.number({ error: t('auth.errors.required') }).int(),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sortOrder: nextSortOrder },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.menu.createCategory({ name: data.name, sortOrder: data.sortOrder })
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('menu.addCategory')}</h2>
          <button type="button" onClick={onClose} className="text-tg-hint text-2xl leading-none px-2">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={t('menu.categoryName')}
            enterKeyHint="next"
            {...register('name')}
            error={errors.name?.message}
          />
          <Field
            label={t('menu.sortOrder')}
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            {...register('sortOrder', { valueAsNumber: true })}
            error={errors.sortOrder?.message}
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
  const perm = usePermissions()
  useBackButton()

  const [categories, setCategories] = useState<MenuCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<EditingItem>(null)
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

  const handleToggle = async (item: MenuItemDto) => {
    try {
      const updated = await api.menu.toggleItem(item.id)
      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          items: cat.items.map(i => i.id === updated.id ? updated : i),
        }))
      )
    } catch {
      // silent — user will see stale state, a reload will fix it
    }
  }

  const handleItemSaved = () => {
    setEditingItem(null)
    load()
  }

  const handleCategorySaved = () => {
    setAddingCategory(false)
    load()
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('menu.title')}</h1>
        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="px-3 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm active:scale-[0.98] transition"
            >
              + {t('menu.addCategory')}
            </button>
            <button
              type="button"
              onClick={() => setEditingItem('new')}
              className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm active:scale-[0.98] transition"
            >
              + {t('menu.addItem')}
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center">
          <p className="text-tg-destructive">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm"
          >
            {t('common.submit')}
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 mt-16 text-center">
          <p className="text-tg-text font-medium">{t('menu.noCategories')}</p>
          <p className="text-tg-hint text-sm">{t('menu.noCategoriesHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {categories.map(cat => (
            <section key={cat.id}>
              <h2 className="text-base font-semibold text-tg-hint uppercase tracking-wide mb-3 px-1">{cat.name}</h2>
              <div className="flex flex-col gap-2">
                {cat.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-tg-text truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-tg-hint">{item.price.toFixed(2)}</span>
                        <span className={`text-xs ${item.isAvailable ? 'text-green-500' : 'text-tg-hint'}`}>
                          {item.isAvailable ? t('menu.available') : t('menu.unavailable')}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 ml-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-tg-bg text-tg-hint active:scale-[0.98] transition text-lg"
                          title={item.isAvailable ? t('menu.unavailable') : t('menu.available')}
                        >
                          {item.isAvailable ? '◉' : '○'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-tg-bg text-tg-hint active:scale-[0.98] transition"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {cat.items.length === 0 && (
                  <p className="text-tg-hint text-sm px-1">{t('menu.noCategories')}</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {editingItem !== null && (
        <ItemFormModal
          categories={categories}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleItemSaved}
        />
      )}

      {addingCategory && (
        <CategoryFormModal
          onClose={() => setAddingCategory(false)}
          onSaved={handleCategorySaved}
          nextSortOrder={categories.length + 1}
        />
      )}
    </main>
  )
}
