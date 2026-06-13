import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '../../lib/api'
import type { StaffMember, UserStatus } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import AppHeader from '../../components/AppHeader'
import StatusPill from '../../components/StatusPill'
import { SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { UsersRound } from 'lucide-react'

const STATUS_KIND: Record<UserStatus, 'ok' | 'warn' | 'muted'> = {
  Active:                'ok',
  PendingPasswordChange: 'warn',
  Inactive:              'muted',
}

export default function StaffTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  const canManage = perm.has('ManageStaff')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  useEffect(() => {
    api.staff.getAll()
      .then(setStaff)
      .catch(e => setError(e instanceof ApiError ? e.message : t('staff.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('dashboard.tabs.staff')}
        subtitle={t('staff.memberCount', { count: staff.length })}
        trailing={canManage ? (
          <button
            type="button"
            onClick={() => navigate('/staff/new')}
            aria-label={t('staff.addButton')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      <div className="px-5 flex flex-col gap-2">
        {loading ? (
          <>{[0, 1, 2].map(i => <SkeletonRow key={i} />)}</>
        ) : error ? (
          <div className="rounded-[18px] bg-card py-8 text-center"
               style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
            <p className="m-0 text-sm text-danger">{error}</p>
          </div>
        ) : staff.length === 0 ? (
          <EmptyState icon={UsersRound} title={t('staff.empty')} hint={t('staff.emptyHint')} />
        ) : (
          staff.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={canManage ? () => navigate(`/staff/${m.id}/edit`) : undefined}
              disabled={!canManage}
              className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3 px-3.5 flex items-center gap-3 text-left"
              style={{
                animationDelay: `${idx * 30}ms`,
                boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
              }}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-fg-2 font-bold shrink-0">
                {(m.firstName?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.005em' }}>
                  {m.lastName} {m.firstName} {m.fatherName}
                </p>
                <p className="m-0 mt-0.5 text-xs text-fg-3">{m.roleName}</p>
              </div>
              <StatusPill kind={STATUS_KIND[m.status]} size="sm">
                {t(`staff.status.${m.status}`)}
              </StatusPill>
            </button>
          ))
        )}
      </div>
    </main>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
