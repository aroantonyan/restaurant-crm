import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { Role, StaffMember } from '../../lib/api'
import { getTelegram } from '../../lib/telegram'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'
import PermissionGrid from '../../components/PermissionGrid'

export default function StaffEdit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const perm = usePermissions()
  useBackButton('/staff')

  // Two tiers: ManageStaff for profile/role, ManageRoles for the permission grid.
  const canManageProfile = perm.has('ManageStaff')
  const canSetPermissions = perm.has('ManageRoles')

  const [member, setMember] = useState<StaffMember | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

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
    phone: z.string().max(30, { error: t('auth.errors.tooLong') }).optional(),
    roleId: z.string().min(1, { error: t('auth.errors.required') }),
  })
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!id) return
    Promise.all([api.staff.getById(id), api.staff.getRoles()])
      .then(([m, r]) => {
        setMember(m)
        setRoles(r)
        setPermissions(m.permissions ?? [])
        reset({
          firstName: m.firstName,
          lastName: m.lastName,
          fatherName: m.fatherName,
          phone: m.phone ?? '',
          roleId: m.roleId,
        })
      })
      .catch(() => setLoadError(t('staff.errors.loadFailed')))
  }, [id, reset, t])

  const onSubmit = async (data: FormData) => {
    if (!id) return
    setServerError(null)
    try {
      // Profile update + (conditional) permission update run in parallel.
      // Skip setPermissions when the caller lacks ManageRoles to avoid a guaranteed 403.
      const calls: Promise<unknown>[] = []
      if (canManageProfile) {
        calls.push(api.staff.update(id, { ...data, phone: data.phone?.trim() || undefined }))
      }
      if (canSetPermissions) {
        calls.push(api.staff.setPermissions(id, permissions))
      }
      await Promise.all(calls)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(-1)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('staff.errors.saveFailed'))
    }
  }

  const handleDeactivate = async () => {
    if (!id) return
    setDeactivating(true)
    try {
      await api.staff.deactivate(id)
      getTelegram()?.HapticFeedback?.impactOccurred('light')
      navigate(-1)
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('staff.errors.deactivateFailed'))
      setConfirming(false)
    } finally {
      setDeactivating(false)
    }
  }

  // Need at least one of the two permissions to be useful on this page.
  if (!canManageProfile && !canSetPermissions) return <Navigate to="/staff" replace />

  if (loadError) {
    return (
      <main className="page-enter flex flex-col items-center justify-center px-5 min-h-full">
        <p className="text-sm text-tg-destructive">{loadError}</p>
      </main>
    )
  }

  if (!member) {
    return (
      <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
        <div className="h-8 w-48 rounded-lg bg-tg-secondary-bg animate-pulse mb-6" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('staff.edit.title')}</h1>
        <p className="text-tg-hint text-sm mt-1">
          {member.lastName} {member.firstName} {member.fatherName}
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field
          label={t('auth.register.firstName')}
          autoComplete="given-name"
          enterKeyHint="next"
          disabled={!canManageProfile}
          {...register('firstName')}
          error={errors.firstName?.message}
        />
        <Field
          label={t('auth.register.lastName')}
          autoComplete="family-name"
          enterKeyHint="next"
          disabled={!canManageProfile}
          {...register('lastName')}
          error={errors.lastName?.message}
        />
        <Field
          label={t('auth.register.fatherName')}
          autoComplete="additional-name"
          enterKeyHint="next"
          disabled={!canManageProfile}
          {...register('fatherName')}
          error={errors.fatherName?.message}
        />
        <Select
          label={t('staff.edit.role')}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          disabled={!canManageProfile}
          {...register('roleId')}
          error={errors.roleId?.message}
        />
        <Field
          label={t('staff.edit.phone')}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          enterKeyHint="done"
          disabled={!canManageProfile}
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
        {(canManageProfile || canSetPermissions) && (
          <SubmitButton loading={isSubmitting}>{t('staff.edit.submit')}</SubmitButton>
        )}
      </form>

      {canManageProfile && (
      <div className="mt-8 pt-6 border-t border-tg-secondary-bg">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-tg-destructive bg-tg-secondary-bg"
          >
            {t('staff.edit.deactivate')}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-center text-tg-hint">{t('staff.edit.deactivateConfirm')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-tg-secondary-bg text-tg-text"
              >
                {t('staff.edit.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-tg-destructive text-white disabled:opacity-50"
              >
                {deactivating ? t('common.loading') : t('staff.edit.deactivateConfirm')}
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </main>
  )
}
