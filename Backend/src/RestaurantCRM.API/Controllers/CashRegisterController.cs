using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.CashRegister;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/cash-register")]
public class CashRegisterController(ICashRegisterService service) : BaseController
{
    [HttpGet("summary")]
    [RequirePermission(PermissionType.ViewCashRegister)]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken ct)
    {
        var result = await service.GetSummaryAsync(from, to, ct);
        return Ok(result);
    }

    [HttpGet("transactions")]
    [RequirePermission(PermissionType.ViewCashRegister)]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] CashTransactionType? type,
        [FromQuery] PaymentMethod? method,
        [FromQuery] int limit = 100,
        CancellationToken ct = default)
    {
        var result = await service.GetTransactionsAsync(from, to, type, method, Math.Clamp(limit, 1, 500), ct);
        return Ok(result);
    }

    [HttpPost("manual")]
    [RequirePermission(PermissionType.ManageCashRegister)]
    public async Task<IActionResult> RecordManualOp(RecordManualOpRequest request, CancellationToken ct)
    {
        var result = await service.RecordManualOpAsync(request, CurrentUserId, ct);
        return Ok(result);
    }
}
