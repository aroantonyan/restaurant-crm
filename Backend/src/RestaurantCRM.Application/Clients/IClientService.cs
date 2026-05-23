using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Clients;

public interface IClientService
{
    Task<List<ClientDto>> GetAllAsync(string? search, bool includeArchived, CancellationToken ct = default);
    Task<ClientDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ClientDto> CreateAsync(CreateClientRequest request, CancellationToken ct = default);
    Task<ClientDto> UpdateAsync(Guid id, UpdateClientRequest request, CancellationToken ct = default);
    Task ArchiveAsync(Guid id, CancellationToken ct = default);

    Task<List<ClientTransactionDto>> GetTransactionsAsync(Guid clientId, int limit, CancellationToken ct = default);
    Task<ClientDto> DepositAsync(Guid clientId, ClientDepositRequest request, Guid createdById, CancellationToken ct = default);
    Task<ClientDto> WithdrawAsync(Guid clientId, ClientWithdrawalRequest request, Guid createdById, CancellationToken ct = default);

    /// <summary>
    /// Stage a Deposit-paid order: debit the client's balance, log the transaction.
    /// No SaveChangesAsync — caller controls the transaction so this commits atomically
    /// with the Order.Status change. Negative balance is permitted (the "В долг" case).
    /// Throws if the client doesn't exist or is archived.
    /// </summary>
    Task StageOrderPaymentAsync(Guid clientId, Guid orderId, decimal amount, Guid createdById, CancellationToken ct = default);

    /// <summary>
    /// If the client has LoyaltyType.Cashback, credit (amount * rate / 100) to their
    /// balance. No-op for None / Discount. Same atomicity contract as StageOrderPaymentAsync.
    /// Returns the cashback amount credited (0 if none).
    /// </summary>
    Task<decimal> StageCashbackAsync(Guid clientId, Guid orderId, decimal orderAmount, Guid createdById, CancellationToken ct = default);
}
