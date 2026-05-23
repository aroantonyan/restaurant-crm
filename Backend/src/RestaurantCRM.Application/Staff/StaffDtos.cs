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
    DateTime CreatedAt,
    List<string> Permissions
);

public record RoleDto(
    Guid Id,
    string Name,
    bool IsDefault,
    List<string> Permissions
);

public record CreateStaffRequest(
    string FirstName,
    string LastName,
    string FatherName,
    string Email,
    string TemporaryPassword,
    Guid RoleId,
    string? Phone,
    List<string>? Permissions
);

public record UpdateStaffRequest(
    string FirstName,
    string LastName,
    string FatherName,
    string? Phone,
    Guid? RoleId
);

public record SetPermissionsRequest(List<string> Permissions);
