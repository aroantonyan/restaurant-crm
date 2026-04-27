namespace RestaurantCRM.Domain.Enums;

public static class DefaultRolePermissions
{
    public static readonly Dictionary<string, PermissionType[]> Map = new()
    {
        ["Admin"] = Enum.GetValues<PermissionType>(),

        ["Manager"] =
        [
            PermissionType.ViewOrders, PermissionType.CreateOrder, PermissionType.EditOrder,
            PermissionType.CancelOrder, PermissionType.MoveOrderItems,
            PermissionType.ViewMenu, PermissionType.ManageMenu,
            PermissionType.ViewTables, PermissionType.ManageTables,
            PermissionType.ViewReservations, PermissionType.ManageReservations,
            PermissionType.ViewWarehouse, PermissionType.ManageWarehouse,
            PermissionType.ViewCashRegister, PermissionType.ManageCashRegister,
            PermissionType.ViewReports,
            PermissionType.ViewStaff, PermissionType.ManageStaff,
            PermissionType.ViewSchedules, PermissionType.ManageSchedules,
            PermissionType.ViewClients, PermissionType.ManageClients,
        ],

        ["Waiter"] =
        [
            PermissionType.ViewMenu,
            PermissionType.ViewTables,
            PermissionType.CreateOrder, PermissionType.EditOrder,
            PermissionType.ViewReservations, PermissionType.ManageReservations,
            PermissionType.ViewClients,
        ],

        ["Cook"] =
        [
            PermissionType.ViewOrders, PermissionType.EditOrder,
            PermissionType.ViewMenu,
        ],

        ["Bartender"] =
        [
            PermissionType.ViewOrders, PermissionType.EditOrder,
            PermissionType.ViewMenu,
            PermissionType.CreateOrder,
        ],

        ["Cashier"] =
        [
            PermissionType.ViewOrders,
            PermissionType.ViewCashRegister, PermissionType.ManageCashRegister,
            PermissionType.ViewReservations,
            PermissionType.ViewClients,
        ],
    };
}
