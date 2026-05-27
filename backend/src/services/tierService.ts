/**
 * Commission-share tier service.
 *
 * VPath Rewards is free for everyone. A member's tier sets the SHARE of the
 * affiliate commission they keep on each confirmed purchase. Members climb tiers
 * by accumulating lifetime confirmed spend — the sum of conversions.order_amount
 * for conversions with status = 'confirmed'.
 *
 * Tiers (member's share of the commission the platform earns):
 *   bronze    20%   all new members           (>= $0 lifetime spend)
 *   silver    35%   >= $500 lifetime spend
 *   gold      50%   >= $1,500 lifetime spend
 *   platinum  65%   >= $3,000 lifetime spend
 *   diamond   80%   >= $6,000 lifetime spend
 *   emerald   85%   >= $12,000 lifetime spend
 *   sapphire  90%   >= $24,000 lifetime spend
 *   ruby      95%   >= $48,000 lifetime spend
 *   obsidian  100%  >= $96,000 lifetime spend
 *
 * Member cashback on a purchase = commission_earned * commissionSharePct / 100.
 * The remaining (100 - commissionSharePct)% is the platform's cut.
 */

import { dbGet, dbRun } from '../database';

export const COMMISSION_TIERS = {
  bronze: {
    name: 'Bronze',
    spendThreshold: 0,
    commissionSharePct: 20,
    description: 'Keep 20% of the commission on every purchase',
  },
  silver: {
    name: 'Silver',
    spendThreshold: 500,
    commissionSharePct: 35,
    description: 'Keep 35% of the commission on every purchase',
  },
  gold: {
    name: 'Gold',
    spendThreshold: 1500,
    commissionSharePct: 50,
    description: 'Keep 50% of the commission on every purchase',
  },
  platinum: {
    name: 'Platinum',
    spendThreshold: 3000,
    commissionSharePct: 65,
    description: 'Keep 65% of the commission on every purchase',
  },
  diamond: {
    name: 'Diamond',
    spendThreshold: 6000,
    commissionSharePct: 80,
    description: 'Keep 80% of the commission on every purchase',
  },
  emerald: {
    name: 'Emerald',
    spendThreshold: 12000,
    commissionSharePct: 85,
    description: 'Keep 85% of the commission on every purchase',
  },
  sapphire: {
    name: 'Sapphire',
    spendThreshold: 24000,
    commissionSharePct: 90,
    description: 'Keep 90% of the commission on every purchase',
  },
  ruby: {
    name: 'Ruby',
    spendThreshold: 48000,
    commissionSharePct: 95,
    description: 'Keep 95% of the commission on every purchase',
  },
  obsidian: {
    name: 'Obsidian',
    spendThreshold: 96000,
    commissionSharePct: 100,
    description: 'Keep 100% of the commission on every purchase',
  },
} as const;

export type CommissionTier = keyof typeof COMMISSION_TIERS;

/** Lowest tier — every new member starts here. */
export const DEFAULT_TIER: CommissionTier = 'bronze';

const TIER_ORDER: CommissionTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'emerald',
  'sapphire',
  'ruby',
  'obsidian',
];

/**
 * Lifetime spend is summed from CONFIRMED conversions only, so a member's tier
 * reflects verified purchases. Change 'confirmed' to also count 'pending' if you
 * want tier progress to advance before the affiliate network locks a sale.
 */
const SPEND_STATUS = 'confirmed';

/** Pure computation: which tier does a given lifetime spend total qualify for? */
export function computeTierFromSpend(lifetimeSpend: number): CommissionTier {
  let tier: CommissionTier = DEFAULT_TIER;
  for (const t of TIER_ORDER) {
    if (lifetimeSpend >= COMMISSION_TIERS[t].spendThreshold) {
      tier = t;
    }
  }
  return tier;
}

/** Return the next tier above the given one, or null if already at the top. */
export function getNextTier(currentTier: CommissionTier): CommissionTier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx < 0 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/**
 * Recompute a user's lifetime spend + tier from confirmed conversions and persist
 * the cached columns (lifetime_spend, activity_tier). Idempotent — safe to call
 * as often as you like.
 */
export async function recomputeUserTier(userId: number): Promise<{
  tier: CommissionTier;
  commissionSharePct: number;
  lifetimeSpend: number;
}> {
  const row = await dbGet<{ spend: number }>(
    `SELECT COALESCE(SUM(order_amount), 0) AS spend
       FROM conversions
      WHERE user_id = ?
        AND status = ?
        AND order_amount IS NOT NULL`,
    [userId, SPEND_STATUS]
  );
  const lifetimeSpend = Number(row?.spend ?? 0);
  const tier = computeTierFromSpend(lifetimeSpend);

  await dbRun(
    `UPDATE users
        SET lifetime_spend = ?,
            activity_tier = ?,
            activity_tier_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [lifetimeSpend, tier, userId]
  );

  return {
    tier,
    commissionSharePct: COMMISSION_TIERS[tier].commissionSharePct,
    lifetimeSpend,
  };
}

/**
 * Read a user's current tier. Always recomputes from confirmed conversions so the
 * answer is correct even if the cached columns are stale (e.g. a brand-new user,
 * or a user migrated from the old subscription model).
 */
export async function getUserActivityTier(userId: number): Promise<{
  tier: CommissionTier;
  commissionSharePct: number;
  lifetimeSpend: number;
  nextTier: CommissionTier | null;
  nextTierThreshold: number | null;
  amountToNextTier: number | null;
}> {
  const { tier, commissionSharePct, lifetimeSpend } = await recomputeUserTier(userId);
  const next = getNextTier(tier);

  return {
    tier,
    commissionSharePct,
    lifetimeSpend,
    nextTier: next,
    nextTierThreshold: next ? COMMISSION_TIERS[next].spendThreshold : null,
    amountToNextTier: next
      ? Math.max(0, COMMISSION_TIERS[next].spendThreshold - lifetimeSpend)
      : null,
  };
}

/**
 * The fraction (0-1) of commission a member keeps right now. Used by the
 * conversion-tracking flow to split each commission between member and platform.
 */
export async function getUserCommissionShare(userId: number): Promise<number> {
  const { commissionSharePct } = await recomputeUserTier(userId);
  return commissionSharePct / 100;
}
