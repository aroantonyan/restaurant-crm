using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantCRM.Application.Auth;
using RestaurantCRM.Domain.Entities;
using RestaurantCRM.Domain.Enums;
using RestaurantCRM.Infrastructure.Persistence;

namespace RestaurantCRM.Infrastructure.Services;

public class AuthService(AppDbContext db, JwtService jwt) : IAuthService
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

        // Create restaurant
        var restaurant = new Restaurant
        {
            Name = request.RestaurantName,
            LegalName = request.RestaurantName,
        };
        db.Restaurants.Add(restaurant);

        // Seed default roles
        var roles = DefaultRolePermissions.Map.Select(entry => new Role
        {
            RestaurantId = restaurant.Id,
            Name = entry.Key,
            IsDefault = true,
            RolePermissions = entry.Value
                .Select(p => new RolePermission { Permission = p })
                .ToList(),
        }).ToList();
        db.Roles.AddRange(roles);

        // Create admin user
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

        var token = jwt.GenerateToken(user, adminRole.Name);
        return new AuthResponse(token, user.Id, restaurant.Id, user.FirstName, user.LastName, adminRole.Name);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email, ct);

        if (user is null)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (user.Status == UserStatus.Inactive)
            throw new UnauthorizedAccessException("Account is inactive.");

        var token = jwt.GenerateToken(user, user.Role.Name);
        return new AuthResponse(token, user.Id, user.RestaurantId, user.FirstName, user.LastName, user.Role.Name);
    }
}
