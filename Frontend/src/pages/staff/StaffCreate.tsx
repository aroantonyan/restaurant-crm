import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { Role } from '../../lib/api'
import { getTelegram } from '../../lib/telegram'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'
import PermissionGrid from '../../components/PermissionGrid'

export default function StaffCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/staff')

  // The component must call all its hooks before any early return,
  // so the permission gate runs at the very end of this function.
  const canManage = perm.has('ManageStaff')
  const canSetPermissions = perm.has('ManageRoles')

  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    firstName: z
      .string()
      .min(1, { error: t('auth.errors.required') })
      .max(100, { error: t('auth.errors.tooLong') }),
    lastName: z
      .string()
      .min(1, { error: t('auth.errors.required') })
      .max(100, { error: t('auth.errors.tooLong') }),
    fatherName: z
      .string()
      .min(1, { error: t('auth.errors.required') })
      .max(100, { error: t('auth.errors.tooLong') }),
    email: z
      .email({ error: t('auth.errors.invalidEmail') })
      .max(256, { error: t('auth.errors.tooLong') }),
    temporaryPassword: z.string().min(6, { error: t('auth.errors.passwordTooShort') }),
    roleId: z.string().min(1, { error: t('auth.errors.required') }),
    phone: z.string().max(30, { error: t('auth.errors.tooLong') }).optional(),
  })
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleId: '' },
  })

  const selectedRoleId = watch('roleId')

  // Populate roles on mount; pre-select the first one.
  useEffect(() => {
    api.staff.getRoles().then((r) => {
      setRoles(r)
      if (r.length > 0) {
        setValue('roleId', r[0].id)
        setPermissions(r[0].permissions)
      }
    })
  }, [setValue])

  // When the admin picks a different role, pre-fill permissions from that role.
  useEffect(() => {
    if (!selectedRoleId || roles.length === 0) return
    const role = roles.find((r) => r.id === selectedRoleId)
    if (role) setPermissions(role.permissions)
  }, [selectedRoleId, roles])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await api.staff.create({
        ...data,
        phone: data.phone?.trim() || undefined,
        // Only send custom permissions when the admin can actually change them;
        // otherwise the new staff member inherits the role's defaults.
        permissions: canSetPermissions ? permissions : undefined,
      })
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(-1)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('staff.errors.saveFailed'))
    }
  }

  // Permission gate — defer to /staff if the user reached this page via URL typing.
  if (!canManage) return <Navigate to="/staff" replace />

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('staff.create.title')}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field
          label={t('auth.register.firstName')}
          autoComplete="given-name"
          enterKeyHint="next"
          {...register('firstName')}
          error={errors.firstName?.message}
        />
        <Field
          label={t('auth.register.lastName')}
          autoComplete="family-name"
          enterKeyHint="next"
          {...register('lastName')}
          error={errors.lastName?.message}
        />
        <Field
          label={t('auth.register.fatherName')}
          autoComplete="additional-name"
          enterKeyHint="next"
          {...register('fatherName')}
          error={errors.fatherName?.message}
        />
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
          label={t('staff.create.tempPassword')}
          type="password"
          autoComplete="new-password"
          enterKeyHint="next"
          {...register('temporaryPassword')}
          error={errors.temporaryPassword?.message}
        />
        <Select
          label={t('staff.create.role')}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          {...register('roleId')}
          error={errors.roleId?.message}
        />
        <Field
          label={t('staff.create.phone')}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="next"
          {...register('phone')}
          error={errors.phone?.message}
        />

        {canSetPermissions && (
          <div className="border-t border-tg-secondary-bg pt-4">
            <PermissionGrid value={permissions} onChange={setPermissions} />
          </div>
        )}

        {serverError && (
          <p className="text-tg-destructive text-sm text-center">{serverError}</p>
        )}
        <SubmitButton loading={isSubmitting}>{t('staff.create.submit')}</SubmitButton>
      </form>
    </main>
  )
}
