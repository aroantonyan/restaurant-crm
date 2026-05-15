import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../lib/api'
import { auth } from '../lib/auth'
import { getTelegram } from '../lib/telegram'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    email: z
      .email({ error: t('auth.errors.invalidEmail') })
      .max(256, { error: t('auth.errors.tooLong') }),
    password: z.string().min(6, { error: t('auth.errors.passwordTooShort') }),
  })
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const res = await api.auth.login(data)
      auth.set(res.token, {
        userId: res.userId,
        restaurantId: res.restaurantId,
        restaurantName: res.restaurantName,
        currency: res.currency,
        firstName: res.firstName,
        lastName: res.lastName,
        roleName: res.roleName,
        permissions: res.permissions,
        status: res.status,
      })
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(res.status === 'PendingPasswordChange' ? '/change-password' : '/dashboard', { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('auth.errors.loginFailed'))
    }
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <LanguageSwitcher />

      {/* logo / icon */}
      <div className="mt-6 mb-7 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-tg-button text-tg-button-text flex items-center justify-center text-2xl shadow-md">
          🍽️
        </div>
      </div>

      <header className="mb-7 text-center">
        <h1 className="text-2xl font-bold">{t('auth.login.title')}</h1>
        <p className="text-tg-hint text-sm mt-1.5">{t('auth.login.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field
          label={t('auth.register.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          {...register('email')}
          error={errors.email?.message}
        />
        <Field
          label={t('auth.register.password')}
          type="password"
          autoComplete="current-password"
          enterKeyHint="done"
          {...register('password')}
          error={errors.password?.message}
        />
        {serverError && <p className="text-tg-destructive text-sm text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('auth.login.submit')}</SubmitButton>
      </form>

      <div className="mt-8 pt-6 border-t border-tg-secondary-bg text-center">
        <p className="text-tg-hint text-sm mb-3">{t('auth.login.noAccount')}</p>
        <Link
          to="/register"
          className="inline-block w-full py-3 rounded-2xl bg-tg-secondary-bg text-tg-text font-medium active:scale-[0.98] transition"
        >
          {t('auth.login.createOne')}
        </Link>
      </div>
    </main>
  )
}
