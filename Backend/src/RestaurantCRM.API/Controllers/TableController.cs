using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Tables;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/tables")]
public class TableController(ITableService tableService) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewTables)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await tableService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageTables)]
    public async Task<IActionResult> Create(CreateTableRequest request, CancellationToken ct)
    {
        var result = await tableService.CreateAsync(request, ct);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageTables)]
    public async Task<IActionResult> Update(Guid id, UpdateTableRequest request, CancellationToken ct)
    {
        var result = await tableService.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [RequirePermission(PermissionType.ManageTables)]
    public async Task<IActionResult> SetStatus(Guid id, UpdateTableStatusRequest request, CancellationToken ct)
    {
        var result = await tableService.SetStatusAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageTables)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await tableService.DeleteAsync(id, ct);
        return NoContent();
    }
}
