using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.CashRegister;

public interface ICashRegisterService
{
    Task<CashRegisterSummaryDto> GetSummaryAsync(DateTime from, DateTime to, CancellationToken ct = default);

    Task<List<CashRegisterTransactionDto>> GetTransactionsAsync(
        DateTime from,
        DateTime to,
        CashTransactionType? type,
        PaymentMethod? method,
        int limit,
        CancellationToken ct = default);

    Task<CashRegisterTransactionDto> RecordManualOpAsync(
        RecordManualOpRequest request,
        Guid createdById,
        CancellationToken ct = default);

    /// <summary>
    /// Stage an OrderPayment row + balance update inside the existing order
    /// transaction. Like the inventory.StageSaleDeductionsAsync sibling: no SaveChanges
    /// here — the order's status change and the payment commit atomically.
    /// </summary>
    Task StageOrderPaymentAsync(
        Guid orderId,
        decimal amount,
        PaymentMethod method,
        Guid createdById,
        CancellationToken ct = default);

    /// <summary>
    /// Stage a ManualIncome / ManualExpense row (e.g. for client deposit / withdrawal
    /// side-effects). The caller passes the desired sign in <paramref name="signedAmount"/> —
    /// positive for inflow, negative for outflow. Only Cash movements move the drawer
    /// balance; other methods are logged for reporting only. Throws on overdraft (Cash + outflow).
    /// No SaveChangesAsync — caller controls the transaction.
    /// </summary>
    Task StageMovementAsync(
        CashTransactionType type,
        decimal signedAmount,
        PaymentMethod method,
        Guid createdById,
        string reason,
        CancellationToken ct = default);
}
