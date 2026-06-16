import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { Role, StaffMember } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import Field from '../../components/Field'
import Select from '../../components/Select'
import SubmitButton from '../../components/SubmitButton'
import PrimaryButton from '../../components/PrimaryButton'
import AppHeader from '../../components/AppHeader'
import PermissionGrid from '../../components/PermissionGrid'

export default function StaffEdit() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const perm = usePermissions()
  const [confirmDiscard, setConfirmDiscard] = useState(false)

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
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // The member's original role, captured on load. Lets us tell a real user-driven
  // role change apart from the initial form population (which must NOT clobber the
  // member's saved — possibly customized — permissions).
  const initialRoleId = useRef<string | null>(null)
  const selectedRoleId = watch('roleId')

  const handleDiscard = () => {
    if (isDirty && !confirmDiscard) { setConfirmDiscard(true); return }
    navigate('/staff')
  }

  useEffect(() => {
    if (!id) return
    Promise.all([api.staff.getById(id), api.staff.getRoles()])
      .then(([m, r]) => {
        setMember(m)
        setRoles(r)
        setPermissions(m.permissions ?? [])
        initialRoleId.current = m.roleId
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

  // When the admin switches the role, pre-fill the permission grid with that
  // role's defaults. Picking the original role back restores the member's own
  // (possibly customized) permissions. No effect during the initial load.
  useEffect(() => {
    if (initialRoleId.current === null || !selectedRoleId || roles.length === 0) return
    if (selectedRoleId === initialRoleId.current) {
      setPermissions(member?.permissions ?? [])
      return
    }
    const role = roles.find(r => r.id === selectedRoleId)
    if (role) setPermissions(role.permissions)
  }, [selectedRoleId, roles, member])

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
      <main className="page-enter h-full overflow-y-auto flex items-center justify-center px-5">
        <p className="text-sm text-danger">{loadError}</p>
      </main>
    )
  }

  if (!member) {
    return (
      <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
        <div className="h-8 w-48 rounded-lg bg-card animate-pulse mb-6" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader
        onBack={handleDiscard}
        title={t('staff.edit.title')}
        subtitle={`${member.lastName} ${member.firstName} ${member.fatherName}`}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 pt-2">
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
          <div className="border-t border-line pt-4">
            <PermissionGrid value={permissions} onChange={setPermissions} />
          </div>
        )}

        {serverError && (
          <p className="text-danger text-sm text-center">{serverError}</p>
        )}
        {(canManageProfile || canSetPermissions) && (
          <SubmitButton loading={isSubmitting}>{t('staff.edit.submit')}</SubmitButton>
        )}
        <PrimaryButton type="button" kind={confirmDiscard ? 'dangerSoft' : 'neutral'} onClick={handleDiscard}>
          {confirmDiscard ? t('common.discardConfirm') : t('common.discard')}
        </PrimaryButton>
      </form>

      {canManageProfile && (
      <div className="mt-8 pt-6 border-t border-line">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full py-3.5 rounded-xl text-sm font-medium text-danger bg-card"
          >
            {t('staff.edit.deactivate')}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-center text-fg-3">{t('staff.edit.deactivateConfirm')}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-card text-fg"
              >
                {t('staff.edit.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="flex-1 py-3.5 rounded-xl text-sm font-medium bg-danger text-white disabled:opacity-50"
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
