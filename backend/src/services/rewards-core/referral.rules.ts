/**
 * Referral rules: pure logic. Given cashback, compute referrer bonus.
 * No DB, no I/O.
 */

import { REFERRAL_BONUS_PERCENTAGE } from './constants';
import { computeReferralBonus } from './calculations';

/**
 * Given a cashback amount earned by a referred user, compute the referrer's bonus
 * using the configured percentage. Negative cashback is clamped to 0.
 */
export function getReferralBonusFromCashback(cashbackAmount: number): number {
  const safe = cashbackAmount < 0 ? 0 : cashbackAmount;
  return computeReferralBonus(safe, REFERRAL_BONUS_PERCENTAGE);
}

/** Percentage used for referral bonus (for persistence/display). */
export function getReferralBonusPercentage(): number {
  return REFERRAL_BONUS_PERCENTAGE;
}
