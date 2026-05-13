using System.ComponentModel.DataAnnotations;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Application.Staff;

public record StaffMemberDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FatherName,
    string Email,
    string? Phone,
    string RoleName,
    Guid RoleId,
    UserStatus Status,
    DateTime CreatedAt
);

public record RoleDto(
    Guid Id,
    string Name,
    bool IsDefault,
    List<string> Permissions
);

public record CreateStaffRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required] string FatherName,
    [Required][EmailAddress] string Email,
    [Required] string TemporaryPassword,
    [Required] Guid RoleId,
    string? Phone
);

public record UpdateStaffRequest(
    [Required] string FirstName,
    [Required] string LastName,
    [Required] string FatherName,
    string? Phone,
    Guid? RoleId
);
