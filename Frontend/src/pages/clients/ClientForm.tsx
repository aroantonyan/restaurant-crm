import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ClientDto, type LoyaltyType } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { getTelegram } from '../../lib/telegram'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'

const LOYALTY_TYPES: LoyaltyType[] = ['None', 'Cashback']
// Discount is in the enum but deferred to v2 — hidden from the picker for now.

interface Props { mode: 'create' | 'edit' }

export default function ClientForm({ mode }: Props) {
  const { id } = useParams<{ id?: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton(mode === 'create' ? '/clients' : `/clients/${id}`)

  const canManage = perm.has('ManageClients')
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit')

  const schema = z.object({
    fullName: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    phone: z.string().max(30, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
    email: z.string().max(256).email({ error: t('auth.errors.invalidEmail') }).optional().or(z.literal('')),
    birthday: z.string().optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
    loyaltyType: z.enum(['None', 'Cashback', 'Discount']),
    loyaltyRate: z.number().min(0).max(100),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { loyaltyType: 'None', loyaltyRate: 0 },
  })

  const loyaltyType = watch('loyaltyType')

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    api.clients.getById(id)
      .then((c: ClientDto) => {
        reset({
          fullName: c.fullName,
          phone: c.phone ?? '',
          email: c.email ?? '',
          birthday: c.birthday ?? '',
          notes: c.notes ?? '',
          loyaltyType: c.loyaltyType,
          loyaltyRate: c.loyaltyRate,
        })
      })
      .catch(() => setServerError(t('clients.errors.loadFailed')))
      .finally(() => setLoadingExisting(false))
  }, [mode, id, reset, t])

  if (!canManage) return <Navigate to="/clients" replace />

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const payload = {
        fullName: data.fullName,
        phone: data.phone || null,
        email: data.email || null,
        birthday: data.birthday || null,
        notes: data.notes || null,
        loyaltyType: data.loyaltyType,
        loyaltyRate: data.loyaltyType === 'None' ? 0 : data.loyaltyRate,
      }
      if (mode === 'create') await api.clients.create(payload)
      else if (id)         await api.clients.update(id, payload as any)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(mode === 'create' ? '/clients' : `/clients/${id}`)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('clients.errors.saveFailed'))
    }
  }

  if (loadingExisting) {
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
    <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">
          {mode === 'create' ? t('clients.newClient') : t('clients.editClient')}
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label={t('clients.fields.fullName')} autoFocus={mode === 'create'} enterKeyHint="next" {...register('fullName')} error={errors.fullName?.message} />
        <Field label={t('clients.fields.phone')}    enterKeyHint="next" inputMode="tel"   {...register('phone')}    error={errors.phone?.message} />
        <Field label={t('clients.fields.email')}    enterKeyHint="next" inputMode="email" {...register('email')}    error={errors.email?.message} />
        <Field label={t('clients.fields.birthday')} enterKeyHint="next" type="date"       {...register('birthday')} error={errors.birthday?.message} />
        <Field label={t('clients.fields.notes')}    enterKeyHint="next" {...register('notes')}    error={errors.notes?.message} />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-fg-3 uppercase tracking-wide px-1">{t('clients.fields.loyalty')}</span>
          <select
            {...register('loyaltyType')}
            className="bg-card text-fg rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent transition"
          >
            {LOYALTY_TYPES.map(lt => (
              <option key={lt} value={lt}>{t(`clients.loyalty.${lt}`)}</option>
            ))}
          </select>
        </div>

        {loyaltyType !== 'None' && (
          <Field
            label={t('clients.fields.loyaltyRate')}
            type="number"
            inputMode="decimal"
            step="0.01"
            enterKeyHint="done"
            {...register('loyaltyRate', { valueAsNumber: true })}
            error={errors.loyaltyRate?.message}
          />
        )}

        {serverError && <p className="text-danger text-sm text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>
          {mode === 'create' ? t('clients.create') : t('clients.save')}
        </SubmitButton>
      </form>
    </main>
  )
}
