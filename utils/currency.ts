
export const DEFAULT_EXCHANGE_RATE = 1550; // 1 USD = 1550 NGN (Default)

/**
 * Converts any amount to the Base Reporting Currency (NGN).
 * Used for aggregations (Totals, Charts, Net Worth).
 */
export const normalizeToNGN = (amount: number, currency: 'NGN' | 'USD', rate: number): number => {
  if (currency === 'NGN') return amount;
  return amount * rate;
};

/**
 * Formats a currency value for display.
 */
export const formatCurrency = (amount: number, currency: 'NGN' | 'USD'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};
