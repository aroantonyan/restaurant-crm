using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RestaurantCRM.Application.Auth;
using RestaurantCRM.Application.Common.Settings;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class AuthService(AppDbContext db, JwtService jwt, IOptions<JwtSettings> jwtOptions, ILogger<AuthService> logger) : IAuthService
{
    private readonly PasswordHasher<User> _hasher = new();
    private readonly JwtSettings _jwt = jwtOptions.Value;

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
        var refreshToken = await IssueRefreshTokenAsync(user.Id, ct);
        return new AuthResponse(token, user.Id, restaurant.Id, restaurant.Name, restaurant.Currency,
            user.FirstName, user.LastName, adminRole.Name, permissions, user.Status.ToString(), refreshToken);
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
        var refreshToken = await IssueRefreshTokenAsync(user.Id, ct);

        await TryLogAuthAsync(user, "Login", $"{user.Email} signed in", ct);

        return BuildResponse(user, token, permissions, refreshToken);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var hash = HashToken(refreshToken);

        // No tenant context exists at refresh time, so ignore the global filters
        // (the User row would otherwise be filtered out by the empty tenant id).
        var stored = await db.RefreshTokens
            .IgnoreQueryFilters()
            .Include(rt => rt.User).ThenInclude(u => u.Restaurant)
            .Include(rt => rt.User).ThenInclude(u => u.Role).ThenInclude(r => r.RolePermissions)
            .Include(rt => rt.User).ThenInclude(u => u.UserPermissions)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash, ct)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        // A revoked token being replayed means it was already rotated — treat as
        // theft and revoke the whole family so the attacker and victim both stop.
        if (stored.RevokedAt is not null)
        {
            await RevokeAllForUserAsync(stored.UserId, ct);
            throw new UnauthorizedAccessException("Refresh token has been revoked.");
        }
        if (DateTime.UtcNow >= stored.ExpiresAt)
            throw new UnauthorizedAccessException("Refresh token has expired.");

        var user = stored.User;
        if (user.Status == UserStatus.Inactive)
            throw new UnauthorizedAccessException("Account is inactive.");

        // Rotate: revoke the presented token and mint a replacement.
        var newRaw = GenerateRawToken();
        var newHash = HashToken(newRaw);
        stored.RevokedAt = DateTime.UtcNow;
        stored.ReplacedByTokenHash = newHash;
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays),
        });
        await db.SaveChangesAsync(ct);

        var permissions = ResolvePermissions(user);
        var token = jwt.GenerateToken(user, user.Role.Name, permissions);
        return BuildResponse(user, token, permissions, newRaw);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        // Idempotent — an unknown or already-revoked token simply no-ops.
        var hash = HashToken(refreshToken);
        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.RevokedAt == null, ct);
        if (stored is null) return;
        stored.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    // ---- refresh-token helpers ----

    private async Task<string> IssueRefreshTokenAsync(Guid userId, CancellationToken ct)
    {
        var raw = GenerateRawToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays),
        });
        await db.SaveChangesAsync(ct);
        return raw;
    }

    private async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var t in active) t.RevokedAt = now;
        await db.SaveChangesAsync(ct);
    }

    // 256 bits of entropy, URL-safe. The raw value is returned to the client once
    // and never stored — only its hash lives in the DB.
    private static string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string HashToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    private static List<string> ResolvePermissions(User user) =>
        user.UserPermissions.Count > 0
            ? user.UserPermissions.Select(p => p.Permission.ToString()).ToList()
            : user.Role.RolePermissions.Select(p => p.Permission.ToString()).ToList();

    private static AuthResponse BuildResponse(User user, string token, IReadOnlyList<string> permissions, string refreshToken) =>
        new(token, user.Id, user.RestaurantId, user.Restaurant.Name, user.Restaurant.Currency,
            user.FirstName, user.LastName, user.Role.Name, permissions, user.Status.ToString(), refreshToken);

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
