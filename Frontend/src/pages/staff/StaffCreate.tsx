import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { Role } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'
import PrimaryButton from '../../components/PrimaryButton'
import AppHeader from '../../components/AppHeader'
import PermissionGrid from '../../components/PermissionGrid'

export default function StaffCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

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
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleId: '' },
  })

  const selectedRoleId = watch('roleId')

  const handleDiscard = () => {
    if (isDirty && !confirmDiscard) { setConfirmDiscard(true); return }
    navigate('/staff')
  }

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
      navigate(-1)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('staff.errors.saveFailed'))
    }
  }

  // Permission gate — defer to /staff if the user reached this page via URL typing.
  if (!canManage) return <Navigate to="/staff" replace />

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader onBack={handleDiscard} title={t('staff.create.title')} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 pt-2">
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
          <div className="border-t border-line pt-4">
            <PermissionGrid value={permissions} onChange={setPermissions} />
          </div>
        )}

        {serverError && (
          <p className="text-danger text-sm text-center">{serverError}</p>
        )}
        <SubmitButton loading={isSubmitting}>{t('staff.create.submit')}</SubmitButton>
        <PrimaryButton type="button" kind={confirmDiscard ? 'dangerSoft' : 'neutral'} onClick={handleDiscard}>
          {confirmDiscard ? t('common.discardConfirm') : t('common.discard')}
        </PrimaryButton>
      </form>
    </main>
  )
}
