using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RestaurantCRM.Application.Auth;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class AuthService(AppDbContext db, JwtService jwt, ILogger<AuthService> logger) : IAuthService
{
    private readonly PasswordHasher<User> _hasher = new();

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("User not found.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.PasswordHash = _hasher.HashPassword(user, request.NewPassword);
        user.Status = UserStatus.Active;

        await db.SaveChangesAsync(ct);
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var emailTaken = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == request.Email, ct);

        if (emailTaken)
            throw new InvalidOperationException("Email is already registered.");

        var restaurant = new Restaurant
        {
            Name = request.RestaurantName,
            LegalName = request.RestaurantName,
        };
        db.Restaurants.Add(restaurant);

        var roles = DefaultRolePermissions.Map.Select(entry => new Role
        {
            RestaurantId = restaurant.Id,
            Name = entry.Key,
            IsDefault = true,
            RolePermissions = [.. entry.Value.Select(p => new RolePermission { Permission = p })],
        }).ToList();
        db.Roles.AddRange(roles);

        var adminRole = roles.First(r => r.Name == "Admin");
        var user = new User
        {
            RestaurantId = restaurant.Id,
            RoleId = adminRole.Id,
            FirstName = request.FirstName,
            LastName = request.LastName,
            FatherName = request.FatherName,
            Email = request.Email,
            Status = UserStatus.Active,
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);
        db.Users.Add(user);

        await db.SaveChangesAsync(ct);

        var permissions = adminRole.RolePermissions.Select(p => p.Permission.ToString()).ToList();
        var token = jwt.GenerateToken(user, adminRole.Name, permissions);
        return new AuthResponse(token, user.Id, restaurant.Id, restaurant.Name, restaurant.Currency,
            user.FirstName, user.LastName, adminRole.Name, permissions, user.Status.ToString());
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        // One query — User + Restaurant + Role + role permissions + user-level overrides
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Restaurant)
            .Include(u => u.Role)
                .ThenInclude(r => r.RolePermissions)
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Email == request.Email, ct)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.Status == UserStatus.Inactive)
            throw new UnauthorizedAccessException("Account is inactive.");

        // User-level permissions override the role when present (custom permission set).
        var permissions = ResolvePermissions(user);
        var token = jwt.GenerateToken(user, user.Role.Name, permissions);

        await TryLogAuthAsync(user, "Login", $"{user.Email} signed in", ct);

        return BuildResponse(user, token, permissions);
    }

    private static List<string> ResolvePermissions(User user) =>
        user.UserPermissions.Count > 0
            ? user.UserPermissions.Select(p => p.Permission.ToString()).ToList()
            : user.Role.RolePermissions.Select(p => p.Permission.ToString()).ToList();

    private static AuthResponse BuildResponse(User user, string token, IReadOnlyList<string> permissions) =>
        new(token, user.Id, user.RestaurantId, user.Restaurant.Name, user.Restaurant.Currency,
            user.FirstName, user.LastName, user.Role.Name, permissions, user.Status.ToString());

    // Auth audit rows are written directly: at login time the request's TenantContext
    // is still empty (JWT not yet applied), so ActivityLogService would short-circuit.
    // Best-effort — never fail auth over a logging hiccup.
    private async Task TryLogAuthAsync(User user, string action, string description, CancellationToken ct)
    {
        try
        {
            db.ActivityLogEntries.Add(new ActivityLogEntry
            {
                RestaurantId = user.RestaurantId,
                UserId = user.Id,
                UserName = user.FullName,
                Category = ActivityCategory.Auth,
                Action = action,
                EntityType = nameof(User),
                EntityId = user.Id,
                Description = description,
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to write Auth/{Action} activity-log entry for {Email}", action, user.Email);
        }
    }
}
