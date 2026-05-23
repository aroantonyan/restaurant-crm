using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// Append-only audit row for every cash-register event.
///
/// `Amount` is signed: positive for inflow (OrderPayment, ManualIncome),
/// negative for outflow (Refund, ManualExpense). This makes "running total"
/// queries a single SUM regardless of type.
///
/// `BalanceAfter` is a snapshot of the restaurant's CASH balance after applying
/// this row. Card / BankTransfer / Other transactions do NOT change the cash
/// balance — the snapshot still reflects the running cash count, unchanged.
///
/// `OrderId` is nullable: present for OrderPayment and Refund, null for manual ops.
/// Restrict FK so an order can't be deleted while its payment record exists.
///
/// CreatedBy is Restrict to preserve accountability — users with cash activity
/// can never be hard-deleted.
/// </summary>
public class CashRegisterTransaction : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid CreatedById { get; set; }
    public Guid? OrderId { get; set; }

    public CashTransactionType Type { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reason { get; set; }

    public User CreatedBy { get; set; } = null!;
    public Order? Order { get; set; }
}
