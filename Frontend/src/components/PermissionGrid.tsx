import { useTranslation } from 'react-i18next'

// All 24 permission keys, organized by group.
// Order within each group: view first, then manage.
const PERMISSION_GROUPS: { key: string; permissions: string[] }[] = [
  { key: 'orders',         permissions: ['ViewOrders', 'CreateOrder', 'EditOrder', 'CancelOrder', 'MoveOrderItems'] },
  { key: 'menu',           permissions: ['ViewMenu', 'ManageMenu'] },
  { key: 'tables',         permissions: ['ViewTables', 'ManageTables'] },
  { key: 'reservations',   permissions: ['ViewReservations', 'ManageReservations'] },
  { key: 'warehouse',      permissions: ['ViewWarehouse', 'ManageWarehouse'] },
  { key: 'cashRegister',   permissions: ['ViewCashRegister', 'ManageCashRegister'] },
  { key: 'reports',        permissions: ['ViewReports'] },
  { key: 'staff',          permissions: ['ViewStaff', 'ManageStaff'] },
  { key: 'schedule',       permissions: ['ViewSchedules', 'ManageSchedules'] },
  { key: 'clients',        permissions: ['ViewClients', 'ManageClients'] },
  { key: 'administration', permissions: ['ManageRoles', 'ManageRestaurantSettings'] },
]

interface Props {
  value: string[]
  onChange: (permissions: string[]) => void
}

export default function PermissionGrid({ value = [], onChange }: Props) {
  const { t } = useTranslation()

  const toggle = (perm: string) => {
    const next = value.includes(perm)
      ? value.filter((p) => p !== perm)
      : [...value, perm]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="m-0 text-[17px] font-bold" style={{ letterSpacing: '-0.015em' }}>
          {t('permissions.title')}
        </p>
        <p className="m-0 mt-0.5 text-[13px] text-fg-3">{t('permissions.hint')}</p>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="m-0 mb-2.5 text-[11.5px] font-bold uppercase text-fg-3"
             style={{ letterSpacing: '0.06em' }}>
            {t(`permissions.groups.${group.key}`)}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.permissions.map((perm) => {
              const active = (value ?? []).includes(perm)
              return (
                <button
                  key={perm}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(perm)}
                  className={`tappable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13.5px] font-semibold leading-tight border-0
                    ${active
                      ? 'bg-accent text-white'
                      : 'bg-card text-fg-2 shadow-[0_1px_0_rgba(15,15,16,.04),0_1px_3px_rgba(15,15,16,.05)]'
                    }`}
                  style={{ letterSpacing: '-0.005em' }}
                >
                  <CheckIcon shown={active} />
                  {t(`permissions.items.${perm}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function CheckIcon({ shown }: { shown: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 transition-all duration-150 ${shown ? 'opacity-100 w-3.5' : 'opacity-0 w-0 -ml-1.5'}`}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
