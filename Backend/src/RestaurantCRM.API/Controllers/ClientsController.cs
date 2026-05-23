using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Clients;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/clients")]
public class ClientsController(IClientService service) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewClients)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool includeArchived = false,
        CancellationToken ct = default)
    {
        var result = await service.GetAllAsync(search, includeArchived, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewClients)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await service.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageClients)]
    public async Task<IActionResult> Create(CreateClientRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageClients)]
    public async Task<IActionResult> Update(Guid id, UpdateClientRequest request, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageClients)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}/transactions")]
    [RequirePermission(PermissionType.ViewClients)]
    public async Task<IActionResult> GetTransactions(Guid id, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var result = await service.GetTransactionsAsync(id, Math.Clamp(limit, 1, 200), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/deposit")]
    [RequirePermission(PermissionType.ManageClients)]
    public async Task<IActionResult> Deposit(Guid id, ClientDepositRequest request, CancellationToken ct)
    {
        var result = await service.DepositAsync(id, request, CurrentUserId, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/withdraw")]
    [RequirePermission(PermissionType.ManageClients)]
    public async Task<IActionResult> Withdraw(Guid id, ClientWithdrawalRequest request, CancellationToken ct)
    {
        var result = await service.WithdrawAsync(id, request, CurrentUserId, ct);
        return Ok(result);
    }
}
