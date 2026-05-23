using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// Append-only audit row for every movement on a client's deposit account.
///
/// `Amount` is signed: positive for inflow (Deposit, CashbackEarned),
/// negative for outflow (Withdrawal, OrderPayment). Running balance can be
/// recomputed at any time as SUM(Amount) per client — the BalanceAfter snapshot
/// is kept for fast point-in-time queries.
///
/// `OrderId` is nullable: present for OrderPayment and CashbackEarned, null for
/// manual deposits/withdrawals. Restrict FK so an order with client activity
/// can't be deleted accidentally.
/// </summary>
public class ClientTransaction : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid ClientId { get; set; }
    public Guid CreatedById { get; set; }
    public Guid? OrderId { get; set; }

    public ClientTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reason { get; set; }

    public Client Client { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public Order? Order { get; set; }
}
