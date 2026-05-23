using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantCRM.API.Auth;
using RestaurantCRM.Application.Reservations;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.API.Controllers;

[Authorize]
[Route("api/reservations")]
public class ReservationsController(IReservationService service) : BaseController
{
    [HttpGet]
    [RequirePermission(PermissionType.ViewReservations)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] ReservationStatus? status,
        CancellationToken ct)
    {
        var result = await service.GetAllAsync(from, to, status, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(PermissionType.ViewReservations)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await service.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [RequirePermission(PermissionType.ManageReservations)]
    public async Task<IActionResult> Create(CreateReservationRequest request, CancellationToken ct)
    {
        var result = await service.CreateAsync(request, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(PermissionType.ManageReservations)]
    public async Task<IActionResult> Update(Guid id, UpdateReservationRequest request, CancellationToken ct)
    {
        var result = await service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [RequirePermission(PermissionType.ManageReservations)]
    public async Task<IActionResult> SetStatus(Guid id, UpdateReservationStatusRequest request, CancellationToken ct)
    {
        var result = await service.SetStatusAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [RequirePermission(PermissionType.ManageReservations)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.DeleteAsync(id, ct);
        return NoContent();
    }
}
