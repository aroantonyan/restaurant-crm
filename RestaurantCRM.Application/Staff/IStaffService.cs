namespace RestaurantCRM.Application.Staff;

public interface IStaffService
{
    Task<List<StaffMemberDto>> GetAllAsync(CancellationToken ct = default);
    Task<StaffMemberDto> GetByIdAsync(Guid userId, CancellationToken ct = default);
    Task<StaffMemberDto> CreateAsync(CreateStaffRequest request, CancellationToken ct = default);
    Task<StaffMemberDto> UpdateAsync(Guid userId, UpdateStaffRequest request, CancellationToken ct = default);
    Task DeactivateAsync(Guid userId, CancellationToken ct = default);
    Task<List<RoleDto>> GetRolesAsync(CancellationToken ct = default);
}
