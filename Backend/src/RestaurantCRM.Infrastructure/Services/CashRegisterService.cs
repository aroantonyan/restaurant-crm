using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.CashRegister;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Cash flow accounting. Every method that changes the balance updates
/// Restaurant.CashBalance atomically with the corresponding transaction row.
///
/// Balance discipline:
///   • Only PaymentMethod.Cash transactions move the drawer balance.
///   • Refunds and ManualExpense store negative Amount values; the +/- math
///     is the same whatever the direction.
///   • Manual cash-out is blocked when it would push the balance negative.
///     Refunds and OrderPayment do not enforce this — refunding a cash sale
///     might legitimately overdraw the drawer (rare, but the kitchen makes
///     it a stocktake problem, not a system rejection).
/// </summary>
public class CashRegisterService(AppDbContext db, ITenantContext tenant, IActivityLogService activityLog) : ICashRegisterService
{
    public async Task<CashRegisterSummaryDto> GetSummaryAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        // Single round trip — group by (Type, Method) and project sums.
        // Flattening before GroupBy avoids the TransparentIdentifier translation
        // issue we hit in ReportsService earlier.
        var aggregates = await db.CashRegisterTransactions
            .Where(t => t.CreatedAt >= from && t.CreatedAt < to)
            .Select(t => new { t.Type, t.Method, t.Amount })
            .GroupBy(x => new { x.Type, x.Method })
            .Select(g => new
            {
                g.Key.Type,
                g.Key.Method,
                Total = g.Sum(x => x.Amount),
                Count = g.Count(),
            })
            .ToListAsync(ct);

        decimal IncomeBy(PaymentMethod m) => aggregates
            .Where(a => a.Type == CashTransactionType.OrderPayment && a.Method == m)
            .Sum(a => a.Total);

        var refunds       = aggregates.Where(a => a.Type == CashTransactionType.Refund       ).Sum(a => a.Total); // negative
        var manualIncome  = aggregates.Where(a => a.Type == CashTransactionType.ManualIncome ).Sum(a => a.Total);
        var manualExpense = aggregates.Where(a => a.Type == CashTransactionType.ManualExpense).Sum(a => a.Total); // negative
        var txCount       = aggregates.Sum(a => a.Count);

        var balance = await db.Restaurants
            .Where(r => r.Id == tenant.RestaurantId)
            .Select(r => r.CashBalance)
            .FirstOrDefaultAsync(ct);

        var incomeCash    = IncomeBy(PaymentMethod.Cash);
        var incomeCard    = IncomeBy(PaymentMethod.Card);
        var incomeBank    = IncomeBy(PaymentMethod.BankTransfer);
        var incomeOther   = IncomeBy(PaymentMethod.Other);
        var net = incomeCash + incomeCard + incomeBank + incomeOther + refunds + manualIncome + manualExpense;

        return new CashRegisterSummaryDto(
            CashBalance: balance,
            IncomeCash: incomeCash,
            IncomeCard: incomeCard,
            IncomeBankTransfer: incomeBank,
            IncomeOther: incomeOther,
            Refunds: refunds,
            ManualIncome: manualIncome,
            ManualExpense: manualExpense,
            Net: net,
            TransactionCount: txCount);
    }

    public async Task<List<CashRegisterTransactionDto>> GetTransactionsAsync(
        DateTime from,
        DateTime to,
        CashTransactionType? type,
        PaymentMethod? method,
        int limit,
        CancellationToken ct = default)
    {
        var query = db.CashRegisterTransactions
            .Include(t => t.CreatedBy)
            .Where(t => t.CreatedAt >= from && t.CreatedAt < to);

        if (type.HasValue) query = query.Where(t => t.Type == type.Value);
        if (method.HasValue) query = query.Where(t => t.Method == method.Value);

        var rows = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(ToDto).ToList();
    }

    public async Task<CashRegisterTransactionDto> RecordManualOpAsync(
        RecordManualOpRequest request,
        Guid createdById,
        CancellationToken ct = default)
    {
        // The endpoint accepts only Cash for manual ops — card "manual op" is meaningless
        // because the drawer isn't involved. Validator already constrained Type to
        // ManualIncome / ManualExpense and Amount > 0; flip the sign for expenses.
        var signedAmount = request.Type == CashTransactionType.ManualExpense
            ? -request.Amount
            : request.Amount;

        await StageMovementAsync(request.Type, signedAmount, PaymentMethod.Cash, createdById, request.Reason.Trim(), ct);
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(createdById, ActivityCategory.CashRegister,
            request.Type == CashTransactionType.ManualIncome ? "CashIn" : "CashOut",
            "CashRegister", null,
            $"{(request.Type == CashTransactionType.ManualIncome ? "Cash in" : "Cash out")} {Math.Abs(signedAmount):N2} — {request.Reason}",
            ct);

        // Re-read the most recent matching row to return a full DTO with CreatedBy filled.
        // The tracked entity is already in the change tracker but its navigation isn't loaded.
        var tx = await db.CashRegisterTransactions
            .Include(t => t.CreatedBy)
            .Where(t => t.CreatedById == createdById && t.Reason == request.Reason.Trim())
            .OrderByDescending(t => t.CreatedAt)
            .FirstAsync(ct);
        return ToDto(tx);
    }

    public async Task StageMovementAsync(
        CashTransactionType type,
        decimal signedAmount,
        PaymentMethod method,
        Guid createdById,
        string reason,
        CancellationToken ct = default)
    {
        // Only Cash movements affect the drawer balance. Card / BankTransfer / Other
        // are logged for reporting but don't change physical cash on hand.
        decimal balanceAfter;
        if (method == PaymentMethod.Cash)
        {
            var restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.Id == tenant.RestaurantId, ct)
                ?? throw new InvalidOperationException("Restaurant not found.");

            var newBalance = restaurant.CashBalance + signedAmount;
            if (newBalance < 0)
                throw new InvalidOperationException(
                    $"Operation would push the cash balance to {newBalance:N2}; current balance is {restaurant.CashBalance:N2}.");

            restaurant.CashBalance = newBalance;
            balanceAfter = newBalance;
        }
        else
        {
            // For non-Cash, snapshot the existing balance unchanged so the audit row is consistent.
            balanceAfter = await db.Restaurants
                .Where(r => r.Id == tenant.RestaurantId)
                .Select(r => r.CashBalance)
                .FirstAsync(ct);
        }

        db.CashRegisterTransactions.Add(new CashRegisterTransaction
        {
            RestaurantId = tenant.RestaurantId,
            CreatedById = createdById,
            Type = type,
            Method = method,
            Amount = signedAmount,
            BalanceAfter = balanceAfter,
            Reason = reason,
        });
    }

    public async Task StageOrderPaymentAsync(
        Guid orderId,
        decimal amount,
        PaymentMethod method,
        Guid createdById,
        CancellationToken ct = default)
    {
        // Called inside OrderService.TransitionStatusAsync — no SaveChanges here.
        // The order status change + cash transaction commit atomically.

        var restaurant = await db.Restaurants.FirstOrDefaultAsync(r => r.Id == tenant.RestaurantId, ct)
            ?? throw new InvalidOperationException("Restaurant not found.");

        decimal newBalance = restaurant.CashBalance;
        if (method == PaymentMethod.Cash)
        {
            newBalance += amount;
            restaurant.CashBalance = newBalance;
        }

        db.CashRegisterTransactions.Add(new CashRegisterTransaction
        {
            RestaurantId = tenant.RestaurantId,
            CreatedById = createdById,
            OrderId = orderId,
            Type = CashTransactionType.OrderPayment,
            Method = method,
            Amount = amount,
            BalanceAfter = newBalance, // unchanged for non-cash methods
            Reason = $"Order #{orderId.ToString()[..8]}",
        });
    }

    private static CashRegisterTransactionDto ToDto(CashRegisterTransaction t) => new(
        t.Id,
        t.Type,
        t.Method,
        t.Amount,
        t.BalanceAfter,
        t.Reason,
        t.OrderId,
        t.CreatedBy.FullName,
        t.CreatedAt);
}
