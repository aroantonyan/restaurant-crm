using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Clients;

public record ClientDto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    DateOnly? Birthday,
    string? Notes,
    decimal DepositBalance,
    LoyaltyType LoyaltyType,
    decimal LoyaltyRate,
    bool IsArchived,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record ClientTransactionDto(
    Guid Id,
    Guid ClientId,
    ClientTransactionType Type,
    decimal Amount,
    decimal BalanceAfter,
    string? Reason,
    Guid? OrderId,
    string CreatedByName,
    DateTime CreatedAt);

public record CreateClientRequest(
    string FullName,
    string? Phone,
    string? Email,
    DateOnly? Birthday,
    string? Notes,
    LoyaltyType LoyaltyType = LoyaltyType.None,
    decimal LoyaltyRate = 0m);

public record UpdateClientRequest(
    string FullName,
    string? Phone,
    string? Email,
    DateOnly? Birthday,
    string? Notes,
    LoyaltyType LoyaltyType,
    decimal LoyaltyRate);

/// <summary>
/// Top up a client's deposit account. If Method is Cash, the cash drawer balance also
/// goes up by the same amount (the cash is physically in the drawer; the restaurant
/// now owes that amount back to the client, captured in DepositBalance).
/// </summary>
public record ClientDepositRequest(
    decimal Amount,
    PaymentMethod Method,
    string? Reason);

/// <summary>
/// Refund part or all of a client's deposit (give cash back). If Method is Cash,
/// the cash drawer balance goes down — overdraft protection applies via the cash register.
/// </summary>
public record ClientWithdrawalRequest(
    decimal Amount,
    PaymentMethod Method,
    string? Reason);
