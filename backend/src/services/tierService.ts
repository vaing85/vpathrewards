/**
 * Activity-based tier service.
 *
 * Replaces the Stripe subscription-based tier model with a free, activity-based
 * tier system. Users climb tiers by accumulating confirmed cashback earnings
 * (sum of cashback_transactions.amount where status='confirmed').
 *
 * Thresholds are in DOLLARS of lifetime confirmed cashback:
 *   free      → 0
 *   bronze    → $5
 *   silver    → $25
 *   gold      → $100
 *   platinum  → $500
 *
 * Each tier adds a flat cashback bonus on top of the offer's base rate.
 */

import { dbGet, dbRun } from '../database';

export const ACTIVITY_TIERS = {
  free: {
    name: 'Free',
    threshold: 0,
    cashbackBonus: 0,
    description: 'Standard cashback rates on every offer',
  },
  bronze: {
    name: 'Bronze',
    threshold: 5,
    cashbackBonus: 1.0,
    description: '+1% cashback bonus on every offer',
  },
  silver: {
    name: 'Silver',
    threshold: 25,
    cashbackBonus: 2.0,
    description: '+2% cashback bonus on every offer',
  },
  gold: {
    name: 'Gold',
    threshold: 100,
    cashbackBonus: 3.0,
    description: '+3% cashback bonus on every offer',
  },
  platinum: {
    name: 'Platinum',
    threshold: 500,
    cashbackBonus: 4.0,
    description: '+4% cashback bonus on every offer',
  },
} as const;

export type ActivityTier = keyof typeof ACTIVITY_TIERS;

const TIER_ORDER: ActivityTier[] = ['free', 'bronze', 'silver', 'gold', 'platinum'];

/** Pure computation: which tier does a given lifetime confirmed cashback total qualify for? */
export function computeTierFromLifetime(lifetimeCashbackConfirmed: number): ActivityTier {
  let tier: ActivityTier = 'free';
  for (const t of TIER_ORDER) {
    if (lifetimeCashbackConfirmed >= ACTIVITY_TIERS[t].threshold) {
      tier = t;
    }
  }
  return tier;
}

/** Return the next tier above the given one, or null if already at the top. */
export function getNextTier(currentTier: ActivityTier): ActivityTier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx < 0 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/**
 * Recompute and persist a user's tier from current confirmed cashback.
 *
 * Call this whenever a cashback_transactions row transitions to 'confirmed'
 * (or on a periodic cron job). Idempotent and safe to call repeatedly.
 */
export async function recomputeUserTier(userId: number): Promise<{
  tier: ActivityTier;
  cashbackBonus: number;
  lifetimeCashbackConfirmed: number;
}> {
  const row = await dbGet<{ confirmed: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS confirmed
       FROM cashback_transactions
      WHERE user_id = ?
        AND status = 'confirmed'`,
    [userId]
  );
  const lifetime = Number(row?.confirmed ?? 0);
  const tier = computeTierFromLifetime(lifetime);

  await dbRun(
    `UPDATE users
        SET lifetime_cashback_confirmed = ?,
            activity_tier = ?,
            activity_tier_updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [lifetime, tier, userId]
  );

  return {
    tier,
    cashbackBonus: ACTIVITY_TIERS[tier].cashbackBonus,
    lifetimeCashbackConfirmed: lifetime,
  };
}

/**
 * Read a user's activity tier, recomputing lazily if the cached value looks stale
 * (NULL on first read after migration).
 */
export async function getUserActivityTier(userId: number): Promise<{
  tier: ActivityTier;
  cashbackBonus: number;
  lifetimeCashbackConfirmed: number;
  nextTier: ActivityTier | null;
  nextTierThreshold: number | null;
  amountToNextTier: number | null;
}> {
  const u = await dbGet<{
    lifetime_cashback_confirmed: number | null;
    activity_tier: string | null;
  }>(
    'SELECT lifetime_cashback_confirmed, activity_tier FROM users WHERE id = ?',
    [userId]
  );

  let lifetime = Number(u?.lifetime_cashback_confirmed ?? 0);
  let tier = (u?.activity_tier as ActivityTier) ?? 'free';

  // If the cached values are null (e.g. first read after migration), recompute.
  if (u?.lifetime_cashback_confirmed == null || u?.activity_tier == null) {
    const recomputed = await recomputeUserTier(userId);
    lifetime = recomputed.lifetimeCashbackConfirmed;
    tier = recomputed.tier;
  }

  const next = getNextTier(tier);
  return {
    tier,
    cashbackBonus: ACTIVITY_TIERS[tier].cashbackBonus,
    lifetimeCashbackConfirmed: lifetime,
    nextTier: next,
    nextTierThreshold: next ? ACTIVITY_TIERS[next].threshold : null,
    amountToNextTier: next ? Math.max(0, ACTIVITY_TIERS[next].threshold - lifetime) : null,
  };
}
