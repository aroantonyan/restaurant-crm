namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// Top-level grouping for activity-log entries. Used as the primary filter on the
/// audit page — every business event belongs to exactly one category.
///
/// Stored as a string in the DB for forward compatibility (adding categories never
/// renumbers existing values).
/// </summary>
public enum ActivityCategory
{
    Auth,           // login attempts (success + failure)
    Order,          // order create, paid, cancelled, item removed
    Menu,           // category / item CRUD, recipe changes
    Inventory,      // product CRUD + stock movements
    Table,          // table CRUD (manual moves; status flips are not logged — too noisy)
    Reservation,    // reservation CRUD + status transitions
    Staff,          // user create, update, deactivate, permission changes
    Role,           // role CRUD + permission grant/revoke
    Client,         // client CRUD + deposits/withdrawals
    CashRegister,   // manual cash-in / cash-out
    Settings,       // restaurant profile changes
    Security,       // permission denials, suspicious activity (future)
}
