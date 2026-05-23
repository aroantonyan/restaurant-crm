namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// Why a cash-register transaction was recorded.
///
/// OrderPayment   — guest paid for an order (Income).
/// Refund         — money returned to a guest (Outflow).
/// ManualIncome   — cash added to the drawer outside of orders: float / change / personal top-up.
/// ManualExpense  — cash leaving the drawer outside of orders: supplier paid in cash,
///                  petty cash expense, employee advance.
/// </summary>
public enum CashTransactionType
{
    OrderPayment,
    Refund,
    ManualIncome,
    ManualExpense,
}
