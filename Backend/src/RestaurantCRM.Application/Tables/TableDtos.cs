namespace RestaurantCRM.Application.Tables;

public record TableDto(Guid Id, int Number, int Capacity, string Status, bool IsVip, decimal VipAmount);

public record CreateTableRequest(int Number, int Capacity = 4, bool IsVip = false, decimal VipAmount = 0m);

public record UpdateTableRequest(int Number, int Capacity, bool IsVip = false, decimal VipAmount = 0m);

public record UpdateTableStatusRequest(string Status);
