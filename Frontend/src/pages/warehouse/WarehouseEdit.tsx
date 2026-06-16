import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ProductDto, type ProductUnit } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'
import PrimaryButton from '../../components/PrimaryButton'
import AppHeader from '../../components/AppHeader'

const UNITS: ProductUnit[] = ['Kg', 'Gram', 'Liter', 'Milliliter', 'Piece']

export default function WarehouseEdit() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const backTarget = `/warehouse/${id}`

  const canManage = perm.has('ManageWarehouse')
  const [product, setProduct] = useState<ProductDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  const schema = z.object({
    name: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    category: z.string().max(100, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
    unit: z.enum(['Kg', 'Gram', 'Liter', 'Milliliter', 'Piece']),
    lowStockThreshold: z.number({ error: t('auth.errors.required') }).min(0),
    notes: z.string().max(1000, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleDiscard = () => {
    if (isDirty && !confirmDiscard) { setConfirmDiscard(true); return }
    navigate(backTarget)
  }

  useEffect(() => {
    if (!id) return
    api.products.getById(id)
      .then(p => {
        setProduct(p)
        reset({
          name: p.name,
          category: p.category ?? '',
          unit: p.unit,
          lowStockThreshold: p.lowStockThreshold,
          notes: p.notes ?? '',
        })
      })
      .catch(() => setServerError(t('warehouse.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [id, reset, t])

  // Suggest existing categories so edits keep the buckets consistent.
  useEffect(() => { api.products.getCategories().then(setCategories).catch(() => {}) }, [])

  if (!canManage) return <Navigate to="/warehouse" replace />

  const onSubmit = async (data: FormData) => {
    if (!product) return
    setServerError(null)
    try {
      await api.products.update(product.id, {
        name: data.name,
        category: data.category || null,
        unit: data.unit,
        lowStockThreshold: data.lowStockThreshold,
        notes: data.notes || null,
      })
      navigate(`/warehouse/${product.id}`)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('warehouse.errors.saveFailed'))
    }
  }

  if (loading) {
    return (
      <main className="page-enter px-5 pt-4 pb-10 max-w-md mx-auto w-full">
        <div className="h-7 w-40 bg-card rounded animate-pulse mb-5" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />)}
        </div>
      </main>
    )
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader onBack={handleDiscard} title={t('warehouse.editProduct')} subtitle={t('warehouse.editHint')} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 pt-2">
        <Field
          label={t('warehouse.name')}
          enterKeyHint="next"
          {...register('name')}
          error={errors.name?.message}
        />

        <Field
          label={t('warehouse.category')}
          enterKeyHint="next"
          placeholder={t('warehouse.categoryPlaceholder')}
          list="warehouse-category-options"
          autoComplete="off"
          {...register('category')}
          error={errors.category?.message}
        />
        <datalist id="warehouse-category-options">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-fg-3 uppercase tracking-wide px-1">{t('warehouse.unit')}</span>
          <select
            {...register('unit')}
            className="bg-card text-fg rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent transition"
          >
            {UNITS.map(u => (
              <option key={u} value={u}>{t(`warehouse.units.${u}`)}</option>
            ))}
          </select>
        </div>

        <Field
          label={t('warehouse.lowStockThreshold')}
          type="number"
          inputMode="decimal"
          step="0.001"
          enterKeyHint="next"
          {...register('lowStockThreshold', { valueAsNumber: true })}
          error={errors.lowStockThreshold?.message}
        />

        <Field
          label={t('warehouse.notes')}
          enterKeyHint="done"
          {...register('notes')}
          error={errors.notes?.message}
        />

        {serverError && <p className="text-danger text-sm text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('warehouse.save')}</SubmitButton>
        <PrimaryButton type="button" kind={confirmDiscard ? 'dangerSoft' : 'neutral'} onClick={handleDiscard}>
          {confirmDiscard ? t('common.discardConfirm') : t('common.discard')}
        </PrimaryButton>
      </form>
    </main>
  )
}
