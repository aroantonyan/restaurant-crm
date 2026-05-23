using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Staff;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class StaffService(AppDbContext db, ITenantContext tenant, IActivityLogService activityLog) : IStaffService
{
    private readonly PasswordHasher<User> _hasher = new();

    public async Task<List<StaffMemberDto>> GetAllAsync(CancellationToken ct = default)
    {
        var users = await db.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
            .Include(u => u.UserPermissions)
            .Where(u => u.Status != UserStatus.Inactive)
            .OrderBy(u => u.LastName)
            .ToListAsync(ct);

        return users.Select(ToDto).ToList();
    }

    public async Task<StaffMemberDto> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
            .Include(u => u.UserPermissions)
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

        var role = await db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == request.RoleId, ct)
            ?? throw new KeyNotFoundException("Role not found.");

        var user = new User
        {
            RestaurantId = tenant.RestaurantId,
            RoleId = role.Id,
            FirstName = request.FirstName,
            LastName = request.LastName,
            FatherName = request.FatherName,
            Email = request.Email,
            Phone = request.Phone,
            Status = UserStatus.PendingPasswordChange,
        };
        user.PasswordHash = _hasher.HashPassword(user, request.TemporaryPassword);

        // If the admin provided a custom permission set, persist it as UserPermissions.
        // Otherwise the user inherits the role's permissions at login time.
        if (request.Permissions is { Count: > 0 })
        {
            user.UserPermissions = request.Permissions
                .Select(p => new UserPermission
                {
                    UserId = user.Id,
                    Permission = Enum.Parse<PermissionType>(p),
                })
                .ToList();
        }

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        user.Role = role;

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Staff, "Created", nameof(User), user.Id,
            $"Staff member {user.FullName} ({user.Email}) created with role '{role.Name}'", ct);

        return ToDto(user);
    }

    public async Task<StaffMemberDto> UpdateAsync(Guid userId, UpdateStaffRequest request, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.FatherName = request.FatherName;
        user.Phone = request.Phone;

        var roleChanged = false;
        var newRoleName = user.Role.Name;
        if (request.RoleId.HasValue && request.RoleId.Value != user.RoleId)
        {
            var role = await db.Roles
                .Include(r => r.RolePermissions)
                .FirstOrDefaultAsync(r => r.Id == request.RoleId.Value, ct)
                ?? throw new KeyNotFoundException("Role not found.");
            user.RoleId = role.Id;
            user.Role = role;
            roleChanged = true;
            newRoleName = role.Name;
        }

        await db.SaveChangesAsync(ct);

        var desc = roleChanged
            ? $"Staff member {user.FullName} updated — role changed to '{newRoleName}'"
            : $"Staff member {user.FullName} updated";
        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Staff,
            roleChanged ? "RoleChanged" : "Updated", nameof(User), user.Id, desc, ct);

        return ToDto(user);
    }

    public async Task DeactivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        user.Status = UserStatus.Inactive;
        await db.SaveChangesAsync(ct);

        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Staff, "Deactivated", nameof(User), user.Id,
            $"Staff member {user.FullName} ({user.Email}) deactivated", ct);
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

    public async Task<StaffMemberDto> SetPermissionsAsync(Guid userId, SetPermissionsRequest request, CancellationToken ct = default)
    {
        var user = await db.Users
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        var newPermissions = request.Permissions
            .Select(p => Enum.Parse<PermissionType>(p))
            .ToList();

        // Replace the entire user-level permission set atomically.
        db.UserPermissions.RemoveRange(user.UserPermissions);

        user.UserPermissions = newPermissions
            .Select(p => new UserPermission { UserId = userId, Permission = p })
            .ToList();

        await db.SaveChangesAsync(ct);

        // Permission changes are security-critical — log the count so an auditor can
        // spot a sudden privilege escalation event in the timeline at a glance.
        await activityLog.LogAsync(tenant.UserId, ActivityCategory.Staff, "PermissionsChanged", nameof(User), user.Id,
            $"Permissions overridden for {user.FullName}: {newPermissions.Count} explicit grant(s)", ct);

        return ToDto(user);
    }

    // Effective permissions: user-level overrides take precedence over the role.
    // If no overrides exist, fall back to the role's permissions.
    private static StaffMemberDto ToDto(User u)
    {
        var permissions = u.UserPermissions.Count > 0
            ? u.UserPermissions.Select(p => p.Permission.ToString()).ToList()
            : u.Role.RolePermissions.Select(p => p.Permission.ToString()).ToList();

        return new(u.Id, u.FirstName, u.LastName, u.FatherName, u.Email,
            u.Phone, u.Role.Name, u.RoleId, u.Status, u.CreatedAt, permissions);
    }
}
