namespace RestaurantCRM.Domain.Enums;

public enum PermissionType
{
    // Orders
    ViewOrders,
    CreateOrder,
    EditOrder,
    CancelOrder,
    MoveOrderItems,

    // Menu
    ViewMenu,
    ManageMenu,

    // Tables
    ViewTables,
    ManageTables,

    // Reservations
    ViewReservations,
    ManageReservations,

    // Warehouse
    ViewWarehouse,
    ManageWarehouse,

    // Cash Register
    ViewCashRegister,
    ManageCashRegister,

    // Reports
    ViewReports,

    // Staff & HR
    ViewStaff,
    ManageStaff,
    ViewSchedules,
    ManageSchedules,

    // Clients
    ViewClients,
    ManageClients,

    // Roles
    ManageRoles,

    // Restaurant settings
    ManageRestaurantSettings,
}
