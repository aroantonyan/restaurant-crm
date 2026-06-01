namespace RestaurantCRM.Application.Orders;

public record OrderDto(
    Guid Id,
    Guid TableId,
    int TableNumber,
    string Status,
    string CreatedBy,
    DateTime CreatedAt,
    List<OrderItemDto> Items,
    decimal Total,
    // Set when the order has been paid; null otherwise.
    string? PaymentMethod = null,
    // Optional linked client for loyalty / deposit billing.
    Guid? ClientId = null,
    string? ClientName = null
);

public record OrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    decimal Price,
    int Quantity,
    string Status,
    string? Notes
);

public record CreateOrderRequest(Guid TableId, List<AddOrderItemRequest> Items, Guid? ClientId = null);

public record AddOrderItemRequest(Guid MenuItemId, int Quantity, string? Notes = null);

// Status is always "Paid" here (cancellation has its own endpoint).
// PaymentMethod is required when status is Paid — the validator enforces it.
// UseDeposit applies the client's store-credit balance toward the bill; ApplyCashback
// credits loyalty cashback on the out-of-pocket remainder. Both opt-in, default off —
// the cashier ticks them per bill in the close-bill sheet.
public record UpdateOrderStatusRequest(
    string Status,
    string? PaymentMethod = null,
    bool UseDeposit = false,
    bool ApplyCashback = false);

public record UpdateOrderItemStatusRequest(string Status);

/// <summary>
/// A close-the-bill preview. The app does not take payment itself — the cashier
/// charges via POS/cash — so this just tells them the numbers:
///   - what the order costs (Subtotal),
///   - the attached client's loyalty + deposit balance,
///   - how much to charge externally if paid by cash/card (SuggestedCharge),
///   - what the customer's balance becomes for each path (deposit vs. other).
/// </summary>
public record BillPreviewDto(
    decimal Subtotal,
    Guid? ClientId,
    string? ClientName,
    decimal ClientDepositBalance,
    string LoyaltyType,
    decimal LoyaltyRate,
    // Cashback credited to the client's balance if paid by any non-deposit method.
    decimal CashbackToEarn,
    // Charge this much on the POS / take this much cash for a non-deposit payment.
    decimal SuggestedCharge,
    // If paid from the deposit balance: how much the balance covers and what's
    // left to settle (negative balance = on credit / "в долг").
    decimal DepositCovers,
    decimal DepositRemainder,
    decimal BalanceAfterDeposit
);
