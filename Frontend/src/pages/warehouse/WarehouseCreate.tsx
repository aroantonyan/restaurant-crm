import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { api, ApiError, type ProductUnit } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { getTelegram } from '../../lib/telegram'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'

const UNITS: ProductUnit[] = ['Kg', 'Gram', 'Liter', 'Milliliter', 'Piece']

export default function WarehouseCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/warehouse')

  const canManage = perm.has('ManageWarehouse')
  const [serverError, setServerError] = useState<string | null>(null)

  // Backend rules: name required, non-negative numbers, max lengths mirror EF config.
  const schema = z.object({
    name: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    category: z.string().max(100, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
    unit: z.enum(['Kg', 'Gram', 'Liter', 'Milliliter', 'Piece']),
    initialStock: z.number({ error: t('auth.errors.required') }).min(0),
    lowStockThreshold: z.number({ error: t('auth.errors.required') }).min(0),
    notes: z.string().max(1000, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'Piece', initialStock: 0, lowStockThreshold: 0 },
  })

  if (!canManage) return <Navigate to="/warehouse" replace />

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.products.create({
        name: data.name,
        category: data.category || null,
        unit: data.unit,
        initialStock: data.initialStock,
        lowStockThreshold: data.lowStockThreshold,
        notes: data.notes || null,
      })
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate('/warehouse')
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('warehouse.errors.saveFailed'))
    }
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">{t('warehouse.newProduct')}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field
          label={t('warehouse.name')}
          enterKeyHint="next"
          autoFocus
          {...register('name')}
          error={errors.name?.message}
        />

        <Field
          label={t('warehouse.category')}
          enterKeyHint="next"
          placeholder={t('warehouse.categoryPlaceholder')}
          {...register('category')}
          error={errors.category?.message}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-tg-hint uppercase tracking-wide px-1">{t('warehouse.unit')}</span>
          <select
            {...register('unit')}
            className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-tg-button transition"
          >
            {UNITS.map(u => (
              <option key={u} value={u}>{t(`warehouse.units.${u}`)}</option>
            ))}
          </select>
        </div>

        <Field
          label={t('warehouse.initialStock')}
          type="number"
          inputMode="decimal"
          step="0.001"
          enterKeyHint="next"
          {...register('initialStock', { valueAsNumber: true })}
          error={errors.initialStock?.message}
        />

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

        {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('warehouse.create')}</SubmitButton>
      </form>
    </main>
  )
}
