import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type MenuCategoryDto, type MenuItemDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { formatPrice } from '../../lib/format'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'

// ---- Item form modal ----

type EditingItem = MenuItemDto | 'new' | null

interface ItemFormProps {
  categoryId: string
  item: MenuItemDto | 'new'
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function ItemFormModal({ categoryId, item, onClose, onSaved, onDeleted }: ItemFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const schema = z.object({
    name: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    description: z.string().max(1000, { error: t('auth.errors.tooLong') }).optional(),
    price: z.number({ error: t('auth.errors.required') }).positive(),
    isAvailable: z.boolean(),
  })
  type FormData = z.infer<typeof schema>

  const isNew = item === 'new'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isNew
      ? { name: '', description: '', price: 0, isAvailable: true }
      : { name: item.name, description: item.description ?? '', price: item.price, isAvailable: item.isAvailable },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      if (isNew) {
        await api.menu.createItem({
          categoryId,
          name: data.name,
          description: data.description || undefined,
          price: data.price,
          isAvailable: data.isAvailable,
        })
      } else {
        await api.menu.updateItem(item.id, {
          categoryId: item.categoryId,
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

  const handleDelete = async () => {
    if (isNew) return
    try {
      await api.menu.deleteItem(item.id)
      onDeleted()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{isNew ? t('menu.addItem') : t('menu.editItem')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={t('menu.itemName')}
            enterKeyHint="next"
            autoFocus={isNew}
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
            <input type="checkbox" className="w-5 h-5 rounded accent-tg-button" {...register('isAvailable')} />
            <span className="text-base text-tg-text">{t('menu.available')}</span>
          </label>

          {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>
            {isNew ? t('menu.addItem') : t('common.submit')}
          </SubmitButton>

          {!isNew && perm.has('ViewWarehouse') && (
            <button
              type="button"
              onClick={() => navigate(`/menu/items/${item.id}/recipe`)}
              className="w-full py-3 rounded-2xl bg-tg-secondary-bg text-tg-text font-medium active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <span>📋</span>
              {t('recipe.openEditor')}
            </button>
          )}

          {!isNew && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-2xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
            >
              {t('menu.deleteItem')}
            </button>
          )}
          {!isNew && confirmDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl bg-tg-destructive text-white font-medium active:scale-[0.98] transition"
            >
              {t('menu.deleteConfirm')}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

// ---- Category rename / delete modal ----

interface CategoryEditProps {
  category: MenuCategoryDto
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function CategoryEditModal({ category, onClose, onSaved, onDeleted }: CategoryEditProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const schema = z.object({
    name: z.string().min(1, { error: t('auth.errors.required') }).max(100, { error: t('auth.errors.tooLong') }),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: category.name },
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.menu.updateCategory(category.id, { name: data.name, sortOrder: category.sortOrder })
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  const handleDelete = async () => {
    try {
      await api.menu.deleteCategory(category.id)
      onDeleted()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('menu.errors.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-tg-bg rounded-t-3xl px-5 pt-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t('menu.editCategory')}</h2>
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
          <SubmitButton loading={isSubmitting}>{t('common.submit')}</SubmitButton>

          {!confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3 rounded-2xl bg-tg-secondary-bg text-tg-destructive font-medium active:scale-[0.98] transition"
            >
              {t('menu.deleteCategory')}
            </button>
          )}
          {confirmDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl bg-tg-destructive text-white font-medium active:scale-[0.98] transition"
            >
              {t('menu.deleteCategoryConfirm')}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

// ---- Main page ----

export default function MenuCategoryPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/menu')

  const [category, setCategory] = useState<MenuCategoryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<EditingItem>(null)
  const [editingCategory, setEditingCategory] = useState(false)

  const canManage = perm.has('ManageMenu')

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const all = await api.menu.getAll()
      const found = all.find(c => c.id === id)
      if (!found) throw new Error('Category not found')
      setCategory(found)
    } catch {
      setError(t('menu.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleToggle = async (item: MenuItemDto, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await api.menu.toggleItem(item.id)
      setCategory(prev => prev ? { ...prev, items: prev.items.map(i => i.id === updated.id ? updated : i) } : prev)
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
        <div className="h-8 w-40 rounded-xl bg-tg-secondary-bg animate-pulse mb-6" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-tg-secondary-bg animate-pulse mb-2.5" />
        ))}
      </main>
    )
  }

  if (error || !category) {
    return (
      <main className="page-enter flex flex-col items-center px-5 pt-16 pb-10 max-w-md mx-auto w-full min-h-full">
        <p className="text-tg-destructive">{error ?? t('menu.errors.loadFailed')}</p>
        <button type="button" onClick={() => navigate('/menu')} className="mt-3 px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
          {t('common.back')}
        </button>
      </main>
    )
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-tg-hint uppercase tracking-wider mb-1">{t('menu.title')}</p>
          <h1 className="text-2xl font-bold truncate">{category.name}</h1>
          <p className="text-xs text-tg-hint mt-1">{t('menu.itemCount', { count: category.items.length })}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditingCategory(true)}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-tg-secondary-bg text-tg-hint active:scale-[0.95] transition"
            aria-label={t('menu.editCategory')}
          >
            <PencilIcon />
          </button>
        )}
      </header>

      {category.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-16 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">🍽️</div>
          <p className="text-tg-text font-medium">{t('menu.noItems')}</p>
          <p className="text-tg-hint text-sm">{t('menu.noItemsHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {category.items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg
                ${!item.isAvailable ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-tg-text">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-tg-hint mt-0.5 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-semibold text-tg-text">{formatPrice(item.price)}</span>
                  {!item.isAvailable && (
                    <span className="text-[11px] text-tg-destructive font-medium uppercase">
                      {t('menu.unavailable')}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingItem(item)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-tg-bg text-tg-text active:scale-[0.95] transition"
                    aria-label={t('menu.editItem')}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={e => handleToggle(item, e)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl bg-tg-bg active:scale-[0.95] transition
                      ${item.isAvailable ? 'text-green-500' : 'text-tg-hint'}`}
                    aria-label={item.isAvailable ? t('menu.unavailable') : t('menu.available')}
                  >
                    {item.isAvailable ? <CheckIcon /> : <EyeOffIcon />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => setEditingItem('new')}
          className="mt-5 w-full py-3.5 rounded-2xl bg-tg-button text-tg-button-text font-semibold active:scale-[0.98] transition"
        >
          + {t('menu.addItem')}
        </button>
      )}

      {editingItem !== null && (
        <ItemFormModal
          categoryId={category.id}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); load() }}
          onDeleted={() => { setEditingItem(null); load() }}
        />
      )}

      {editingCategory && (
        <CategoryEditModal
          category={category}
          onClose={() => setEditingCategory(false)}
          onSaved={() => { setEditingCategory(false); load() }}
          onDeleted={() => navigate('/menu', { replace: true })}
        />
      )}
    </main>
  )
}

// ---- icons ----

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
