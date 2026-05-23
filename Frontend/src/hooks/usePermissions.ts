import { auth } from '../lib/auth'

export type Permission =
  | 'ViewOrders' | 'CreateOrder' | 'EditOrder' | 'CancelOrder' | 'MoveOrderItems'
  | 'ViewMenu' | 'ManageMenu'
  | 'ViewTables' | 'ManageTables'
  | 'ViewReservations' | 'ManageReservations'
  | 'ViewWarehouse' | 'ManageWarehouse'
  | 'ViewCashRegister' | 'ManageCashRegister'
  | 'ViewReports'
  | 'ViewStaff' | 'ManageStaff'
  | 'ViewSchedules' | 'ManageSchedules'
  | 'ViewClients' | 'ManageClients'
  | 'ManageRoles'
  | 'ManageRestaurantSettings'
  | 'ViewActivityLog'

export function usePermissions() {
  const set = new Set(auth.getSession()?.permissions ?? [])

  return {
    /** True when the user has every one of the supplied permissions. */
    has: (...permissions: Permission[]): boolean =>
      permissions.every(p => set.has(p)),

    /** True when the user has at least one of the supplied permissions. */
    hasAny: (...permissions: Permission[]): boolean =>
      permissions.some(p => set.has(p)),
  }
}
