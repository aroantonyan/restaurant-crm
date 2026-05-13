using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Staff;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class StaffService(AppDbContext db) : IStaffService
{
    private readonly PasswordHasher<User> _hasher = new();

    public async Task<List<StaffMemberDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await db.Users
            .Include(u => u.Role)
            .Where(u => u.Status != UserStatus.Inactive)
            .OrderBy(u => u.LastName)
            .Select(u => ToDto(u))
            .ToListAsync(ct);
    }

    public async Task<StaffMemberDto> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        return ToDto(user);
    }

    public async Task<StaffMemberDto> CreateAsync(CreateStaffRequest request, CancellationToken ct = default)
    {
        var emailTaken = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == request.Email, ct);

        if (emailTaken)
            throw new InvalidOperationException("Email is already in use.");

        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId, ct)
            ?? throw new KeyNotFoundException("Role not found.");

        var user = new User
        {
            RestaurantId = role.RestaurantId,
            RoleId = role.Id,
            FirstName = request.FirstName,
            LastName = request.LastName,
            FatherName = request.FatherName,
            Email = request.Email,
            Phone = request.Phone,
            Status = UserStatus.PendingPasswordChange,
        };
        user.PasswordHash = _hasher.HashPassword(user, request.TemporaryPassword);

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        user.Role = role;
        return ToDto(user);
    }

    public async Task<StaffMemberDto> UpdateAsync(Guid userId, UpdateStaffRequest request, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.FatherName = request.FatherName;
        user.Phone = request.Phone;

        if (request.RoleId.HasValue && request.RoleId.Value != user.RoleId)
        {
            var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == request.RoleId.Value, ct)
                ?? throw new KeyNotFoundException("Role not found.");
            user.RoleId = role.Id;
            user.Role = role;
        }

        await db.SaveChangesAsync(ct);
        return ToDto(user);
    }

    public async Task DeactivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        user.Status = UserStatus.Inactive;
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<RoleDto>> GetRolesAsync(CancellationToken ct = default)
    {
        return await db.Roles
            .Include(r => r.RolePermissions)
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto(
                r.Id,
                r.Name,
                r.IsDefault,
                r.RolePermissions.Select(rp => rp.Permission.ToString()).ToList()
            ))
            .ToListAsync(ct);
    }

    private static StaffMemberDto ToDto(User u) =>
        new(u.Id, u.FirstName, u.LastName, u.FatherName, u.Email,
            u.Phone, u.Role.Name, u.RoleId, u.Status, u.CreatedAt);
}
