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
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-base font-semibold text-tg-text">{t('permissions.title')}</p>
        <p className="text-xs text-tg-hint mt-0.5">{t('permissions.hint')}</p>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-semibold uppercase tracking-wider text-tg-hint mb-2">
            {t(`permissions.groups.${group.key}`)}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.permissions.map((perm) => {
              const active = (value ?? []).includes(perm)
              return (
                <button
                  key={perm}
                  type="button"
                  onClick={() => toggle(perm)}
                  className={[
                    'px-3 py-2 rounded-xl text-sm font-medium leading-tight transition-colors active:scale-[0.97]',
                    active
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-secondary-bg text-tg-hint',
                  ].join(' ')}
                >
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
