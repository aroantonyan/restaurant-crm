using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

/// <summary>
/// A restaurant guest with a tracked record — separate from staff Users.
///
/// DepositBalance is a denormalized cache of the signed sum of this client's
/// ClientTransaction rows, kept in sync atomically with each transaction.
/// Negative balance is permitted and represents money the client owes the
/// restaurant (the "В долг" / on-credit case explicitly required by the spec).
///
/// LoyaltyType + LoyaltyRate configure automatic rewards:
///   None       — no rewards
///   Cashback   — LoyaltyRate% of the paid amount is credited to DepositBalance
///                after the order is paid by any method except Deposit itself
///                (paying with the deposit doesn't earn cashback — that would be
///                a loyalty arbitrage exploit).
///   Discount   — placeholder for v2; not honored by the current order flow.
///
/// Archive (soft delete) — historical orders and transactions reference this row;
/// hard delete would break audit reports.
/// </summary>
public class Client : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateOnly? Birthday { get; set; }
    public string? Notes { get; set; }

    public decimal DepositBalance { get; set; }
    public LoyaltyType LoyaltyType { get; set; } = LoyaltyType.None;
    public decimal LoyaltyRate { get; set; }

    public bool IsArchived { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public ICollection<ClientTransaction> Transactions { get; set; } = [];
}
