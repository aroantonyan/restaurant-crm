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
    email:    z.email({ error: t('auth.errors.invalidEmail') }).max(256, { error: t('auth.errors.tooLong') }),
    password: z.string().min(6, { error: t('auth.errors.passwordTooShort') }),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const res = await api.auth.login(data)
      auth.set(res.token, {
        userId:         res.userId,
        restaurantId:   res.restaurantId,
        restaurantName: res.restaurantName,
        currency:       res.currency,
        firstName:      res.firstName,
        lastName:       res.lastName,
        roleName:       res.roleName,
        permissions:    res.permissions,
        status:         res.status,
      })
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(res.status === 'PendingPasswordChange' ? '/change-password' : '/dashboard', { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('auth.errors.loginFailed'))
    }
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <div className="px-5 pt-3 flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="px-5 mt-2 flex flex-col items-center">
        <div className="w-16 h-16 rounded-[20px] bg-accent text-white flex items-center justify-center text-3xl mb-4"
             style={{ boxShadow: '0 10px 24px -8px rgba(217,99,63,.40), 0 1px 3px rgba(15,15,16,.06)' }}>
          🍽️
        </div>
        <h1 className="m-0 text-[28px] font-bold text-fg" style={{ letterSpacing: '-0.02em' }}>
          {t('auth.login.title')}
        </h1>
        <p className="m-0 mt-1.5 text-sm text-fg-3 text-center">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-5 mt-7 flex flex-col gap-4">
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
        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('auth.login.submit')}</SubmitButton>
      </form>

      <div className="mx-5 mt-8 pt-6 border-t border-line text-center">
        <p className="m-0 text-sm text-fg-3 mb-3">{t('auth.login.noAccount')}</p>
        <Link
          to="/register"
          className="block w-full py-3.5 rounded-2xl bg-card text-fg font-semibold tappable text-[15.5px]"
          style={{
            letterSpacing: '-0.005em',
            boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
          }}
        >
          {t('auth.login.createOne')}
        </Link>
      </div>
    </main>
  )
}
