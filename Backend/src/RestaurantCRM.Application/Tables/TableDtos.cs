namespace RestaurantCRM.Application.Tables;

public record TableDto(Guid Id, int Number, int Capacity, string Status);

public record CreateTableRequest(int Number, int Capacity = 4);

public record UpdateTableRequest(int Number, int Capacity);
