/**
 * Core reward calculations (cashback, referral bonus).
 * All monetary results are rounded to cents (see ROUNDING.md).
 */

/**
 * Round a number to 2 decimal places (cents). Uses round half away from zero.
 * Single source of truth for rewards rounding; do not round elsewhere.
 */
export function roundToCents(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Compute cashback amount from purchase amount and cashback rate (percentage).
 * Result rounded to cents.
 */
export function computeCashbackAmount(purchaseAmount: number, cashbackRatePercent: number): number {
  const raw = (purchaseAmount * cashbackRatePercent) / 100;
  return roundToCents(raw);
}

/**
 * Compute referral bonus amount (e.g. referrer share of a cashback transaction).
 * Result rounded to cents.
 */
export function computeReferralBonus(cashbackAmount: number, bonusPercent: number): number {
  const raw = (cashbackAmount * bonusPercent) / 100;
  return roundToCents(raw);
}
