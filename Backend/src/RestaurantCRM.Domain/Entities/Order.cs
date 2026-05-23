using RestaurantCRM.Domain.Common;
using RestaurantCRM.Domain.Enums;

namespace RestaurantCRM.Domain.Entities;

public class Order : BaseEntity, ITenantEntity
{
    public Guid RestaurantId { get; set; }
    public Guid TableId { get; set; }
    public Guid CreatedById { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Open;

    // Set when the order transitions to Paid; null while Open or Cancelled.
    // Drives the cash-register integration: Cash payments move the drawer balance;
    // Card/BankTransfer/Other are recorded for reporting but don't.
    public PaymentMethod? PaymentMethod { get; set; }

    // Optional link to a tracked Client. Required only when paying via
    // PaymentMethod.Deposit (deduct from client's account) or when the client
    // has a Cashback loyalty program (credit the % after payment).
    public Guid? ClientId { get; set; }

    public Restaurant Restaurant { get; set; } = null!;
    public Table Table { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public Client? Client { get; set; }
    public ICollection<OrderItem> Items { get; set; } = [];
}
