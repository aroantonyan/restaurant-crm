using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.Application.Tables;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/tables")]
public class TableController(ITableService tableService) : BaseController
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await tableService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTableRequest request, CancellationToken ct)
    {
        var result = await tableService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetAll), result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTableRequest request, CancellationToken ct)
    {
        var result = await tableService.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await tableService.DeleteAsync(id, ct);
        return NoContent();
    }
}
