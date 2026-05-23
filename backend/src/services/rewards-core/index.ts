/**
 * Rewards-core: constants, pure math, referral rules, and referral service.
 */

export { REFERRAL_BONUS_PERCENTAGE } from './constants';
export {
  roundToCents,
  computeCashbackAmount,
  computeReferralBonus,
  computePayout,
  PLATFORM_FEE_USD,
  type PayoutSplit,
} from './calculations';
export { getReferralBonusFromCashback, getReferralBonusPercentage } from './referral.rules';
export { createReferralEarning, confirmReferralEarning } from './referral.service';
