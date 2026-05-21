/**
 * Subscriptions route (post-pivot, commission-share tiers).
 *
 * The platform is free for everyone. A member's tier sets the share of the
 * affiliate commission they keep on each purchase, and tiers are climbed by
 * lifetime confirmed spend — not by paying a subscription.
 *
 * The Stripe checkout / billing-portal endpoints return HTTP 410 (Gone). The
 * underlying Stripe service code is preserved so a premium paid add-on can be
 * layered on later without rewriting the integration.
 *
 * The path /api/subscriptions/status is intentionally retained so the frontend
 * keeps working with no API URL changes — only the response shape evolved.
 */

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { COMMISSION_TIERS, getUserActivityTier } from '../services/tierService';

const router = express.Router();

// GET /api/subscriptions/status — current user's commission tier
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const t = await getUserActivityTier(req.userId!);

    res.json({
      // Backwards-compatible field names so existing frontend code keeps working.
      plan: t.tier,
      status: 'active',
      stripe_enabled: false,

      // Commission-share tier fields.
      commission_share: t.commissionSharePct,
      lifetime_spend: t.lifetimeSpend,
      next_plan: t.nextTier,
      next_plan_threshold: t.nextTierThreshold,
      amount_to_next_plan: t.amountToNextTier,

      plans: (Object.keys(COMMISSION_TIERS) as Array<keyof typeof COMMISSION_TIERS>).map(
        (key) => {
          const p = COMMISSION_TIERS[key];
          return {
            key,
            name: p.name,
            commission_share: p.commissionSharePct,
            spend_threshold: p.spendThreshold,
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
      'Paid subscriptions are no longer available. V PATHing Rewards is free for everyone — your tier, and the share of commission you keep, rises automatically as you shop.',
  });
});

// POST /api/subscriptions/portal — DEPRECATED. Free model.
router.post('/portal', authenticateToken, async (_req: AuthRequest, res) => {
  return res.status(410).json({
    error: 'Billing portal is no longer available. All memberships are free.',
  });
});

export default router;
