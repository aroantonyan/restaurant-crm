using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.CashRegister;
using RestaurantCRM.Application.Clients;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

/// <summary>
/// Client / CRM operations.
///
/// Same denormalized-counter + immutable-log pattern as inventory and cash register:
/// every change to DepositBalance commits atomically with the matching ClientTransaction
/// row, so the cached balance can never drift from the audit log.
///
/// Deposit/Withdrawal operations linked to PaymentMethod.Cash also write a
/// CashRegisterTransaction (double-entry accounting): the cash drawer changes AND
/// the client liability changes, and either both succeed or both roll back.
/// </summary>
public class ClientService(
    AppDbContext db,
    ITenantContext tenant,
    ICashRegisterService cashRegister,
    IActivityLogService activityLog) : IClientService
{
    public async Task<List<ClientDto>> GetAllAsync(string? search, bool includeArchived, CancellationToken ct = default)
    {
        var query = db.Clients.AsQueryable();

        if (!includeArchived) query = query.Where(c => !c.IsArchived);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            // Case-insensitive substring match against name OR phone — Postgres
            // performs ILIKE-style search via EF Core's translated ToLower.Contains.
            query = query.Where(c =>
                c.FullName.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.ToLower().Contains(s)));
        }

        var clients = await query
            .OrderBy(c => c.FullName)
            .ToListAsync(ct);

        return clients.Select(ToDto).ToList();
    }

    public async Task<ClientDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Client not found.");
        return ToDto(client);
    }

    public async Task<ClientDto> CreateAsync(CreateClientRequest request, CancellationToken ct = default)
    {
        // Phone duplicate check — within a restaurant, the same phone is probably the
        // same person. Reject duplicates to keep the customer list clean.
        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var phoneTaken = await db.Clients
                .AnyAsync(c => !c.IsArchived && c.Phone == request.Phone.Trim(), ct);
            if (phoneTaken)
                throw new InvalidOperationException("A client with this phone number already exists.");
        }

        var client = new Client
        {
            RestaurantId = tenant.RestaurantId,
            FullName = request.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Birthday = request.Birthday,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            LoyaltyType = request.LoyaltyType,
            LoyaltyRate = request.LoyaltyType == LoyaltyType.None ? 0m : request.LoyaltyRate,
        };

        db.Clients.Add(client);
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Client, "Created", nameof(Client), client.Id,
            $"Client '{client.FullName}' created", ct);

        return ToDto(client);
    }

    public async Task<ClientDto> UpdateAsync(Guid id, UpdateClientRequest request, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Client not found.");

        if (client.IsArchived)
            throw new InvalidOperationException("This client is archived and cannot be edited.");

        var newPhone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (newPhone != null && newPhone != client.Phone)
        {
            var phoneTaken = await db.Clients
                .AnyAsync(c => c.Id != id && !c.IsArchived && c.Phone == newPhone, ct);
            if (phoneTaken)
                throw new InvalidOperationException("A client with this phone number already exists.");
        }

        client.FullName = request.FullName.Trim();
        client.Phone = newPhone;
        client.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        client.Birthday = request.Birthday;
        client.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        client.LoyaltyType = request.LoyaltyType;
        client.LoyaltyRate = request.LoyaltyType == LoyaltyType.None ? 0m : request.LoyaltyRate;

        await db.SaveChangesAsync(ct);
        return ToDto(client);
    }

    public async Task ArchiveAsync(Guid id, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException("Client not found.");

        if (client.IsArchived) return; // idempotent

        // Refuse to archive a client with a non-zero balance — would lose track of
        // money owed (positive = restaurant owes them; negative = they owe restaurant).
        if (client.DepositBalance != 0m)
            throw new InvalidOperationException(
                $"Cannot archive client with a non-zero balance ({client.DepositBalance:N2}). Settle the balance first.");

        client.IsArchived = true;
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Client, "Archived", nameof(Client), client.Id,
            $"Client '{client.FullName}' archived", ct);
    }

    public async Task<List<ClientTransactionDto>> GetTransactionsAsync(Guid clientId, int limit, CancellationToken ct = default)
    {
        var exists = await db.Clients.AnyAsync(c => c.Id == clientId, ct);
        if (!exists) throw new KeyNotFoundException("Client not found.");

        var rows = await db.ClientTransactions
            .Include(t => t.CreatedBy)
            .Where(t => t.ClientId == clientId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return rows.Select(t => new ClientTransactionDto(
            t.Id, t.ClientId, t.Type, t.Amount, t.BalanceAfter, t.Reason, t.OrderId,
            t.CreatedBy.FullName, t.CreatedAt)).ToList();
    }

    public async Task<ClientDto> DepositAsync(Guid clientId, ClientDepositRequest request, Guid createdById, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == clientId, ct)
            ?? throw new KeyNotFoundException("Client not found.");
        if (client.IsArchived)
            throw new InvalidOperationException("This client is archived.");

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? $"Deposit for {client.FullName}"
            : request.Reason.Trim();

        var newBalance = client.DepositBalance + request.Amount;
        client.DepositBalance = newBalance;

        db.ClientTransactions.Add(new ClientTransaction
        {
            RestaurantId = tenant.RestaurantId,
            ClientId = client.Id,
            CreatedById = createdById,
            Type = ClientTransactionType.Deposit,
            Amount = request.Amount,
            BalanceAfter = newBalance,
            Reason = reason,
        });

        // Double-entry: cash physically arrived (or was logged through Card/Bank).
        // Cash → drawer rises by Amount. Card/Bank → logged but drawer unchanged.
        // Both ledgers commit in the same SaveChanges below.
        await cashRegister.StageMovementAsync(
            CashTransactionType.ManualIncome,
            request.Amount,
            request.Method,
            createdById,
            reason,
            ct);

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(createdById, ActivityCategory.Client, "Deposit", nameof(Client), client.Id,
            $"Deposit of {request.Amount:N2} ({request.Method}) for {client.FullName}", ct);

        return ToDto(client);
    }

    public async Task<ClientDto> WithdrawAsync(Guid clientId, ClientWithdrawalRequest request, Guid createdById, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == clientId, ct)
            ?? throw new KeyNotFoundException("Client not found.");
        if (client.IsArchived)
            throw new InvalidOperationException("This client is archived.");

        // Withdrawing more than the client has would refund money the restaurant doesn't owe. Block.
        if (client.DepositBalance < request.Amount)
            throw new InvalidOperationException(
                $"Insufficient balance: {client.DepositBalance:N2} available, {request.Amount:N2} requested.");

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? $"Withdrawal for {client.FullName}"
            : request.Reason.Trim();

        var newBalance = client.DepositBalance - request.Amount;
        client.DepositBalance = newBalance;

        db.ClientTransactions.Add(new ClientTransaction
        {
            RestaurantId = tenant.RestaurantId,
            ClientId = client.Id,
            CreatedById = createdById,
            Type = ClientTransactionType.Withdrawal,
            Amount = -request.Amount,
            BalanceAfter = newBalance,
            Reason = reason,
        });

        // Mirror to cash register. For Cash this also enforces drawer-overdraft protection.
        await cashRegister.StageMovementAsync(
            CashTransactionType.ManualExpense,
            -request.Amount,
            request.Method,
            createdById,
            reason,
            ct);

        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(createdById, ActivityCategory.Client, "Withdrawal", nameof(Client), client.Id,
            $"Withdrawal of {request.Amount:N2} ({request.Method}) for {client.FullName}", ct);

        return ToDto(client);
    }

    public async Task StageOrderPaymentAsync(Guid clientId, Guid orderId, decimal amount, Guid createdById, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == clientId, ct)
            ?? throw new KeyNotFoundException("Client not found.");
        if (client.IsArchived)
            throw new InvalidOperationException("This client is archived; cannot charge their deposit.");

        var newBalance = client.DepositBalance - amount;
        client.DepositBalance = newBalance;

        db.ClientTransactions.Add(new ClientTransaction
        {
            RestaurantId = tenant.RestaurantId,
            ClientId = client.Id,
            CreatedById = createdById,
            OrderId = orderId,
            Type = ClientTransactionType.OrderPayment,
            Amount = -amount,
            BalanceAfter = newBalance,
            Reason = $"Order #{orderId.ToString()[..8]}",
        });

        // No SaveChangesAsync — caller transaction.
    }

    public async Task<decimal> StageCashbackAsync(Guid clientId, Guid orderId, decimal orderAmount, Guid createdById, CancellationToken ct = default)
    {
        var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == clientId, ct);
        if (client is null || client.IsArchived || client.LoyaltyType != LoyaltyType.Cashback || client.LoyaltyRate <= 0m)
            return 0m;

        var cashback = Math.Round(orderAmount * (client.LoyaltyRate / 100m), 2);
        if (cashback <= 0m) return 0m;

        var newBalance = client.DepositBalance + cashback;
        client.DepositBalance = newBalance;

        db.ClientTransactions.Add(new ClientTransaction
        {
            RestaurantId = tenant.RestaurantId,
            ClientId = client.Id,
            CreatedById = createdById,
            OrderId = orderId,
            Type = ClientTransactionType.CashbackEarned,
            Amount = cashback,
            BalanceAfter = newBalance,
            Reason = $"Cashback {client.LoyaltyRate}% on order #{orderId.ToString()[..8]}",
        });

        return cashback;
    }

    private static ClientDto ToDto(Client c) => new(
        c.Id,
        c.FullName,
        c.Phone,
        c.Email,
        c.Birthday,
        c.Notes,
        c.DepositBalance,
        c.LoyaltyType,
        c.LoyaltyRate,
        c.IsArchived,
        c.CreatedAt,
        c.UpdatedAt);
}
