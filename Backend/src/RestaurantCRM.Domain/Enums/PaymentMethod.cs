namespace RestaurantCRM.Domain.Enums;

/// <summary>
/// How a guest settled the bill.
///
/// Only `Cash` movements affect the physical cash drawer balance — card and bank
/// transfers flow to the bank account, not the operator's drawer. `Deposit` debits
/// the linked client's account balance (and may push it negative — the "В долг"
/// credit case). `Other` is an escape hatch for non-standard arrangements
/// (employee meal, voucher, promotional comp) that still need a payment record
/// but don't move money.
/// </summary>
public enum PaymentMethod
{
    Cash,
    Card,
    BankTransfer,
    Deposit,
    Other,
}
