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

/**
 * Platform's flat fee per conversion (in USD). Charged whenever the commission
 * exceeds the fee; waived entirely on smaller commissions so users still get
 * something for low-value purchases. Tweak this constant to change platform
 * economics across the whole network.
 */
export const PLATFORM_FEE_USD = 5;

export interface PayoutSplit {
  /** What gets credited to the user on this conversion. */
  userAmount: number;
  /**
   * Total platform keep (flat fee + share of the remainder). Equal to
   * platformFee + (commission - PLATFORM_FEE_USD) × (1 - tierShare) when the
   * fee applies, or 0 when the fee is waived.
   */
  platformAmount: number;
  /**
   * Just the flat fee portion of platformAmount. 0 when the fee is waived
   * (commission ≤ PLATFORM_FEE_USD), PLATFORM_FEE_USD otherwise. Surfaced
   * separately so callers can split fee revenue from variable margin in
   * their books — see /admin/dashboard for the breakdown.
   */
  platformFee: number;
  /** True if the conversion was below the fee threshold (fee waived). */
  feeWaived: boolean;
}

/**
 * Split a CJ commission between user and platform per VPathRewards' payout
 * model:
 *   commission <= PLATFORM_FEE_USD  → user gets it all, platform gets 0
 *   commission >  PLATFORM_FEE_USD  → platform takes the flat fee, the
 *                                     remainder is split per the user's
 *                                     tier share (e.g. Bronze 0.20, Gold
 *                                     0.50, Diamond 0.80).
 *
 * Flat-rate (one-time cash bounty) offers are special: the tier share does
 * NOT apply. The platform only takes the flat fee and the user keeps the
 * entire remainder. Pass { flatRate: true } for those — it forces the
 * effective share to 1 (the sub-fee waiver still applies for bounties ≤ fee).
 *
 * Pure function — no DB, no env reads, no side effects. Defensive: clamps
 * tierShare to [0, 1] and treats negative commissions as zero. All money is
 * rounded to cents via roundToCents.
 */
export function computePayout(
  commission: number,
  tierShare: number,
  opts?: { flatRate?: boolean }
): PayoutSplit {
  const c = commission > 0 ? commission : 0;
  const share = opts?.flatRate ? 1 : Math.max(0, Math.min(1, tierShare));

  if (c <= PLATFORM_FEE_USD) {
    return {
      userAmount: roundToCents(c),
      platformAmount: 0,
      platformFee: 0,
      feeWaived: true,
    };
  }

  const remaining = c - PLATFORM_FEE_USD;
  const userAmount = roundToCents(remaining * share);
  // Platform keeps the fee plus whatever the user didn't get from the remainder.
  // We compute platformAmount as (commission − userAmount) so the two always sum
  // back to the original commission (modulo rounding to cents).
  const platformAmount = roundToCents(c - userAmount);

  return {
    userAmount,
    platformAmount,
    platformFee: PLATFORM_FEE_USD,
    feeWaived: false,
  };
}
