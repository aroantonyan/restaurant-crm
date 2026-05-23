import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../lib/api'
import { getTelegram } from '../lib/telegram'
import { useBackButton } from '../hooks/useBackButton'
import { usePermissions } from '../hooks/usePermissions'
import Field from '../components/Field'
import Select from '../components/Select'
import SubmitButton from '../components/SubmitButton'

const CURRENCIES = [
  { value: 'AMD', label: 'AMD — Armenian Dram' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'RUB', label: 'RUB — Russian Ruble' },
  { value: 'GEL', label: 'GEL — Georgian Lari' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const perm = usePermissions()
  const canEdit = perm.has('ManageRestaurantSettings')
  useBackButton('/dashboard')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const schema = z.object({
    name: z
      .string()
      .min(1, { error: t('auth.errors.required') })
      .max(200, { error: t('auth.errors.tooLong') }),
    legalName: z
      .string()
      .min(1, { error: t('auth.errors.required') })
      .max(300, { error: t('auth.errors.tooLong') }),
    currency: z.string().min(1, { error: t('auth.errors.required') }),
    address: z.string().max(500, { error: t('auth.errors.tooLong') }).optional(),
    phone: z.string().max(30, { error: t('auth.errors.tooLong') }).optional(),
  })
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', legalName: '', currency: 'AMD', address: '', phone: '' },
  })

  useEffect(() => {
    api.restaurant
      .getMe()
      .then((r) => {
        reset({
          name: r.name,
          legalName: r.legalName,
          currency: CURRENCIES.some((c) => c.value === r.currency) ? r.currency : 'AMD',
          address: r.address ?? '',
          phone: r.phone ?? '',
        })
      })
      .catch(() => setLoadError(t('settings.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [reset, t])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    setSaved(false)
    try {
      await api.restaurant.updateMe({
        name: data.name,
        legalName: data.legalName,
        currency: data.currency,
        address: data.address?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      })
      getTelegram()?.HapticFeedback?.notificationOccurred('success')
      setSaved(true)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('settings.errors.saveFailed'))
    }
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('common.settings')}</h1>
        <p className="text-tg-hint text-sm mt-1">{t('settings.subtitle')}</p>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-tg-hint text-sm">{t('common.loading')}</p>
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-tg-secondary-bg">
          <p className="text-tg-destructive text-sm text-center">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Inputs disabled in read-only mode so the user can still see values. */}
          <Field
            label={t('settings.name')}
            autoComplete="organization"
            enterKeyHint="next"
            disabled={!canEdit}
            {...register('name')}
            error={errors.name?.message}
          />
          <Field
            label={t('settings.legalName')}
            enterKeyHint="next"
            disabled={!canEdit}
            {...register('legalName')}
            error={errors.legalName?.message}
          />
          <Select
            label={t('settings.currency')}
            options={CURRENCIES}
            disabled={!canEdit}
            {...register('currency')}
            error={errors.currency?.message}
          />
          <Field
            label={t('settings.address')}
            autoComplete="street-address"
            enterKeyHint="next"
            disabled={!canEdit}
            {...register('address')}
            error={errors.address?.message}
          />
          <Field
            label={t('settings.phone')}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="done"
            disabled={!canEdit}
            {...register('phone')}
            error={errors.phone?.message}
          />

          {serverError && (
            <p className="text-tg-destructive text-sm text-center">{serverError}</p>
          )}
          {saved && (
            <p className="text-tg-button text-sm text-center">{t('settings.saved')}</p>
          )}

          {canEdit && (
            <SubmitButton loading={isSubmitting}>{t('settings.submit')}</SubmitButton>
          )}
        </form>
      )}
    </main>
  )
}
