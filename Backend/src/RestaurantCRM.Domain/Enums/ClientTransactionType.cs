namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// Why a row was appended to a client's transaction ledger.
///
/// Deposit         — client added money to their account (top-up). Positive amount.
/// Withdrawal      — client withdrew money from their account (refund). Negative amount.
/// OrderPayment    — order paid using the deposit balance. Negative amount.
/// CashbackEarned  — % cashback credited after a non-deposit-paid order. Positive amount.
/// </summary>
public enum ClientTransactionType
{
    Deposit,
    Withdrawal,
    OrderPayment,
    CashbackEarned,
}
