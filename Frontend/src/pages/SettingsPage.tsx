import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { usePermissions } from '../hooks/usePermissions'
import Field from '../components/Field'
import Select from '../components/Select'
import AppHeader from '../components/AppHeader'
import StickyActions from '../components/StickyActions'
import PrimaryButton from '../components/PrimaryButton'

const CURRENCIES = [
  { value: 'AMD', label: 'AMD — Armenian Dram' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'RUB', label: 'RUB — Russian Ruble' },
  { value: 'GEL', label: 'GEL — Georgian Lari' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const canEdit = perm.has('ManageRestaurantSettings')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const schema = z.object({
    name:      z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
    legalName: z.string().min(1, { error: t('auth.errors.required') }).max(300, { error: t('auth.errors.tooLong') }),
    currency:  z.string().min(1, { error: t('auth.errors.required') }),
    address:   z.string().max(500, { error: t('auth.errors.tooLong') }).optional(),
    phone:     z.string().max(30,  { error: t('auth.errors.tooLong') }).optional(),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', legalName: '', currency: 'AMD', address: '', phone: '' },
  })

  useEffect(() => {
    api.restaurant.getMe()
      .then(r => reset({
        name: r.name,
        legalName: r.legalName,
        currency: CURRENCIES.some(c => c.value === r.currency) ? r.currency : 'AMD',
        address: r.address ?? '',
        phone: r.phone ?? '',
      }))
      .catch(() => setLoadError(t('settings.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [reset, t])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    setSaved(false)
    try {
      await api.restaurant.updateMe({
        name:      data.name,
        legalName: data.legalName,
        currency:  data.currency,
        address:   data.address?.trim() || undefined,
        phone:     data.phone?.trim() || undefined,
      })
      setSaved(true)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('settings.errors.saveFailed'))
    }
  }

  return (
    <div className="relative h-full overflow-hidden">
      <main className={`page-enter h-full overflow-y-auto ${canEdit ? 'pb-[120px]' : 'pb-7'}`}>
        <AppHeader
          onBack={() => navigate('/dashboard')}
          title={t('common.settings')}
          subtitle={t('settings.subtitle')}
        />

        <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="px-5 flex flex-col gap-4">
          {loading && <p className="m-0 text-sm text-fg-3 text-center py-12">{t('common.loading')}</p>}

          {loadError && (
            <div className="rounded-2xl bg-danger-soft px-4 py-4 text-center">
              <p className="m-0 text-sm text-danger">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <>
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

              {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}
              {saved && <p className="m-0 text-sm text-ok text-center">{t('settings.saved')}</p>}
            </>
          )}
        </form>
      </main>

      {canEdit && !loading && !loadError && (
        <StickyActions>
          <PrimaryButton
            kind="primary"
            type="submit"
            disabled={isSubmitting}
            onClick={() => (document.getElementById('settings-form') as HTMLFormElement | null)?.requestSubmit()}
          >
            {isSubmitting ? t('common.loading') : t('settings.submit')}
          </PrimaryButton>
        </StickyActions>
      )}
    </div>
  )
}
