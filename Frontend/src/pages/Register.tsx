import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../lib/api'
import { auth } from '../lib/auth'
import Field from '../components/Field'
import SubmitButton from '../components/SubmitButton'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    firstName:      z.string().min(1, { error: t('auth.errors.required') }).max(100, { error: t('auth.errors.tooLong') }),
    lastName:       z.string().min(1, { error: t('auth.errors.required') }).max(100, { error: t('auth.errors.tooLong') }),
    fatherName:     z.string().min(1, { error: t('auth.errors.required') }).max(100, { error: t('auth.errors.tooLong') }),
    email:          z.email({ error: t('auth.errors.invalidEmail') }).max(256, { error: t('auth.errors.tooLong') }),
    password:       z.string().min(6, { error: t('auth.errors.passwordTooShort') }),
    restaurantName: z.string().min(1, { error: t('auth.errors.required') }).max(200, { error: t('auth.errors.tooLong') }),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const res = await api.auth.register(data)
      auth.setFromResponse(res)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('auth.errors.registerFailed'))
    }
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <div className="px-5 pt-3 flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="px-5 mt-2">
        <h1 className="m-0 text-[28px] font-bold text-fg" style={{ letterSpacing: '-0.02em' }}>
          {t('auth.register.title')}
        </h1>
        <p className="m-0 mt-1.5 text-sm text-fg-3">{t('auth.register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-5 mt-6 flex flex-col gap-5">
        <section>
          <p className="m-0 mb-3 px-1 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
            {t('auth.register.section.restaurant')}
          </p>
          <Field
            label={t('auth.register.restaurantName')}
            autoComplete="organization"
            enterKeyHint="next"
            {...register('restaurantName')}
            error={errors.restaurantName?.message}
          />
        </section>

        <section className="flex flex-col gap-4">
          <p className="m-0 px-1 text-[11.5px] font-bold uppercase text-fg-3" style={{ letterSpacing: '0.06em' }}>
            {t('auth.register.section.admin')}
          </p>
          <Field label={t('auth.register.firstName')}  autoComplete="given-name"      enterKeyHint="next" {...register('firstName')}  error={errors.firstName?.message} />
          <Field label={t('auth.register.lastName')}   autoComplete="family-name"     enterKeyHint="next" {...register('lastName')}   error={errors.lastName?.message} />
          <Field label={t('auth.register.fatherName')} autoComplete="additional-name" enterKeyHint="next" {...register('fatherName')} error={errors.fatherName?.message} />
          <Field label={t('auth.register.email')} type="email" autoComplete="email" inputMode="email" enterKeyHint="next" {...register('email')}    error={errors.email?.message} />
          <Field label={t('auth.register.password')} type="password" autoComplete="new-password" enterKeyHint="done" {...register('password')} error={errors.password?.message} />
        </section>

        {serverError && <p className="m-0 text-sm text-danger text-center">{serverError}</p>}
        <SubmitButton loading={isSubmitting}>{t('auth.register.submit')}</SubmitButton>
      </form>

      <p className="m-0 mt-6 px-5 text-center text-fg-3 text-sm">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="text-accent font-semibold">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </main>
  )
}
