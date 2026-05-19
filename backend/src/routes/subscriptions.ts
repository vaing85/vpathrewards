/**
 * Subscriptions route (post-pivot).
 *
 * The platform is now free for all members. Tiers are activity-based — climbed
 * by accumulating confirmed cashback, not by paying a subscription.
 *
 * The Stripe checkout / billing portal endpoints return HTTP 410 (Gone). The
 * underlying Stripe service code is preserved in stripeService.ts so a premium
 * add-on tier can be re-enabled later without rewriting the integration.
 *
 * The endpoint path /api/subscriptions/status is intentionally retained so the
 * frontend (TierProgress.tsx, Profile.tsx, etc.) continues to work with no API
 * URL changes — only the response shape evolved.
 */

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ACTIVITY_TIERS, getUserActivityTier } from '../services/tierService';

const router = express.Router();

// GET /api/subscriptions/status — current user's activity tier
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const t = await getUserActivityTier(req.userId!);

    res.json({
      // Backwards-compatible field names so existing frontend code keeps working.
      plan: t.tier,
      status: 'active',
      stripe_enabled: false,
      cashback_bonus: t.cashbackBonus,

      // New activity-tier fields.
      lifetime_cashback_confirmed: t.lifetimeCashbackConfirmed,
      next_plan: t.nextTier,
      next_plan_threshold: t.nextTierThreshold,
      amount_to_next_plan: t.amountToNextTier,

      plans: (Object.keys(ACTIVITY_TIERS) as Array<keyof typeof ACTIVITY_TIERS>).map(
        (key) => {
          const p = ACTIVITY_TIERS[key];
          return {
            key,
            name: p.name,
            threshold: p.threshold,
            cashbackBonus: p.cashbackBonus,
            description: p.description,
          };
        }
      ),
    });
  } catch (error) {
    console.error('Error fetching tier status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/checkout — DEPRECATED. Free model.
router.post('/checkout', authenticateToken, async (_req: AuthRequest, res) => {
  return res.status(410).json({
    error:
      'Paid subscriptions are no longer available. V PATHing Rewards is free for everyone — higher tiers unlock automatically as you earn confirmed cashback.',
  });
});

// POST /api/subscriptions/portal — DEPRECATED. Free model.
router.post('/portal', authenticateToken, async (_req: AuthRequest, res) => {
  return res.status(410).json({
    error: 'Billing portal is no longer available. All memberships are free.',
  });
});

export default router;
