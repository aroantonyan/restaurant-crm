import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { StaffMember, UserStatus } from '../../lib/api'
import { useBackButton } from '../../hooks/useBackButton'
import { usePermissions } from '../../hooks/usePermissions'

const STATUS_CONFIG: Record<UserStatus, { color: string }> = {
  Active: { color: 'text-green-500' },
  PendingPasswordChange: { color: 'text-amber-500' },
  Inactive: { color: 'text-tg-hint' },
}

export default function StaffTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const canManage = perm.has('ManageStaff')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useBackButton('/dashboard')

  useEffect(() => {
    api.staff
      .getAll()
      .then(setStaff)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('staff.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.tabs.staff')}</h1>
      </header>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-tg-secondary-bg">
          <p className="text-sm text-tg-destructive">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-tg-hint uppercase tracking-wide font-medium">
              {t('staff.memberCount', { count: staff.length })}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => navigate('/staff/new')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tg-button text-tg-button-text text-sm font-medium"
              >
                <span className="text-base leading-none">+</span>
                {t('staff.addButton')}
              </button>
            )}
          </div>

          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-tg-secondary-bg">
              <p className="text-base font-medium">{t('staff.empty')}</p>
              <p className="text-tg-hint text-sm mt-2">{t('staff.emptyHint')}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {staff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  statusLabel={t(`staff.status.${member.status}`)}
                  statusColor={STATUS_CONFIG[member.status].color}
                  // Tap-to-edit only when the user can actually edit.
                  onClick={canManage ? () => navigate(`/staff/${member.id}/edit`) : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}

interface StaffCardProps {
  member: StaffMember
  statusLabel: string
  statusColor: string
  onClick?: () => void
}

function StaffCard({ member, statusLabel, statusColor, onClick }: StaffCardProps) {
  const interactive = typeof onClick === 'function'
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={[
          'w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left',
          interactive ? 'active:scale-[0.99] transition' : 'cursor-default',
        ].join(' ')}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-tg-text truncate">
            {member.lastName} {member.firstName} {member.fatherName}
          </span>
          <span className="text-xs text-tg-hint">{member.roleName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          {interactive && <span className="text-tg-hint text-base leading-none">›</span>}
        </div>
      </button>
    </li>
  )
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse" />
      ))}
    </div>
  )
}
