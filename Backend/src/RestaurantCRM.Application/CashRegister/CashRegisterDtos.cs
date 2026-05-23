using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.CashRegister;

public record CashRegisterTransactionDto(
    Guid Id,
    CashTransactionType Type,
    PaymentMethod Method,
    decimal Amount,
    decimal BalanceAfter,
    string? Reason,
    Guid? OrderId,
    string CreatedByName,
    DateTime CreatedAt);

/// <summary>
/// Per-method breakdown of orders income for the requested date range.
/// `Net` is total income minus refunds and manual expenses.
/// </summary>
public record CashRegisterSummaryDto(
    decimal CashBalance,
    decimal IncomeCash,
    decimal IncomeCard,
    decimal IncomeBankTransfer,
    decimal IncomeOther,
    decimal Refunds,
    decimal ManualIncome,
    decimal ManualExpense,
    decimal Net,
    int TransactionCount);

/// <summary>
/// Client payload for the manual Cash In / Cash Out endpoint.
/// Type must be one of ManualIncome or ManualExpense — validator enforces that.
/// `Amount` is always given as a positive number; the server flips the sign for expenses.
/// </summary>
public record RecordManualOpRequest(
    CashTransactionType Type,
    decimal Amount,
    string Reason);
