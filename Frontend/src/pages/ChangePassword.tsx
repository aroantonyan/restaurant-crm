import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../lib/api'
import { auth } from '../lib/auth'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import AppHeader from '../components/AppHeader'

export default function ChangePassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z
    .object({
      currentPassword: z.string().min(1, { error: t('auth.errors.required') }),
      newPassword:     z.string().min(6, { error: t('auth.errors.passwordTooShort') }),
      confirmPassword: z.string().min(1, { error: t('auth.errors.required') }),
    })
    .refine(d => d.newPassword === d.confirmPassword, {
      message: t('auth.changePassword.errors.passwordMismatch'),
      path: ['confirmPassword'],
    })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.auth.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      auth.setStatus('Active')
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('auth.changePassword.errors.failed'))
    }
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader title={t('auth.changePassword.title')} subtitle={t('auth.changePassword.subtitle')} />

      <form onSubmit={handleSubmit(onSubmit)} className="px-5 flex flex-col gap-4">
        <Field
          label={t('auth.changePassword.currentPassword')}
          type="password"
          autoComplete="current-password"
          enterKeyHint="next"
          {...register('currentPassword')}
          error={errors.currentPassword?.message}
        />
        <Field
          label={t('auth.changePassword.newPassword')}
          type="password"
          autoComplete="new-password"
          enterKeyHint="next"
          {...register('newPassword')}
          error={errors.newPassword?.message}
        />
        <Field
          label={t('auth.changePassword.confirmPassword')}
          type="password"
          autoComplete="new-password"
          enterKeyHint="done"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('auth.changePassword.submit')}</SubmitButton>
      </form>
    </main>
  )
}
