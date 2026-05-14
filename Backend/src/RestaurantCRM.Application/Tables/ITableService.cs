namespace RestaurantCRM.Application.Tables;

public interface ITableService
{
    Task<List<TableDto>> GetAllAsync(CancellationToken ct = default);
    Task<TableDto> CreateAsync(CreateTableRequest request, CancellationToken ct = default);
    Task<TableDto> UpdateAsync(Guid id, UpdateTableRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
