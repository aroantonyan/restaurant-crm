import { auth } from './auth'
import type { ProductUnit } from './api'

// Currencies where decimals are conventionally hidden when zero
const NO_DECIMAL_CURRENCIES = new Set(['AMD', 'JPY', 'KRW', 'HUF', 'CLP'])

// Short labels for inventory units. "pcs" is the international short for "pieces".
const UNIT_LABEL: Record<ProductUnit, string> = {
  Kg: 'kg',
  Gram: 'g',
  Liter: 'L',
  Milliliter: 'mL',
  Piece: 'pcs',
}

/**
 * Format a stock quantity with its unit. Trims trailing zeros so 25.000 reads as "25",
 * but keeps real decimals so 1.5 reads as "1.5". Pieces are always whole numbers.
 */
export function formatQuantity(amount: number, unit: ProductUnit): string {
  const isPieceLike = unit === 'Piece'
  const num = isPieceLike
    ? Math.round(amount).toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
  return `${num} ${UNIT_LABEL[unit]}`
}

/**
 * Format a money amount using the current restaurant's currency.
 * Drops trailing .00 for currencies that don't use decimals (e.g. AMD).
 */
export function formatPrice(amount: number, currencyOverride?: string): string {
  const currency = currencyOverride ?? auth.getSession()?.currency ?? 'AMD'
  const noDecimal = NO_DECIMAL_CURRENCIES.has(currency)
  // For no-decimal currencies (AMD, JPY, …) always round to the nearest integer —
  // computed values like average ticket can be non-integer even when the underlying
  // prices are whole numbers.
  const display = noDecimal ? Math.round(amount) : amount
  const formatted = noDecimal
    ? display.toLocaleString('en-US')
    : display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${formatted} ${currency}`
}
