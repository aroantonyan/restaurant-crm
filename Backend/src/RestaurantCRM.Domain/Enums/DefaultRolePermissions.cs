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
            PermissionType.ViewActivityLog,
        ],

        ["Waiter"] =
        [
            PermissionType.ViewMenu,
            PermissionType.ViewTables,
            // Waiters need to see their own orders after creating them and update
            // item statuses as they're delivered (Pending → Ready → Served).
            PermissionType.ViewOrders, PermissionType.CreateOrder, PermissionType.EditOrder,
            PermissionType.MoveOrderItems,
            PermissionType.ViewReservations, PermissionType.ManageReservations,
            PermissionType.ViewClients,
            PermissionType.ViewSchedules,
        ],

        ["Cook"] =
        [
            PermissionType.ViewOrders, PermissionType.EditOrder,
            // Advancing item status (Pending → Preparing → Ready) on the kitchen
            // display is the cook's primary action — without this they can see
            // orders but can't drive them through the prep pipeline.
            PermissionType.MoveOrderItems,
            PermissionType.ViewMenu,
            PermissionType.ViewSchedules,
        ],

        ["Bartender"] =
        [
            PermissionType.ViewOrders, PermissionType.EditOrder,
            // Same as Cook — drinks have their own prep pipeline on the kitchen
            // display and the bartender needs to bump them through it.
            PermissionType.MoveOrderItems,
            PermissionType.ViewMenu,
            PermissionType.CreateOrder,
            PermissionType.ViewSchedules,
        ],

        ["Cashier"] =
        [
            PermissionType.ViewOrders,
            PermissionType.ViewCashRegister, PermissionType.ManageCashRegister,
            PermissionType.ViewReservations,
            PermissionType.ViewClients,
            PermissionType.ViewSchedules,
        ],
    };
}
