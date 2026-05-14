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
    string FirstName,
    string LastName,
    string FatherName,
    string Email,
    string TemporaryPassword,
    Guid RoleId,
    string? Phone
);

public record UpdateStaffRequest(
    string FirstName,
    string LastName,
    string FatherName,
    string? Phone,
    Guid? RoleId
);
