import { auth } from './auth'

// Currencies where decimals are conventionally hidden when zero
const NO_DECIMAL_CURRENCIES = new Set(['AMD', 'JPY', 'KRW', 'HUF', 'CLP'])

/**
 * Format a money amount using the current restaurant's currency.
 * Drops trailing .00 for currencies that don't use decimals (e.g. AMD).
 */
export function formatPrice(amount: number, currencyOverride?: string): string {
  const currency = currencyOverride ?? auth.getSession()?.currency ?? 'AMD'
  const hideDecimals = NO_DECIMAL_CURRENCIES.has(currency) && Number.isInteger(amount)
  const formatted = hideDecimals
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} ${currency}`
}
