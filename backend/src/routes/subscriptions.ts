import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbGet } from '../database';
import {
  stripeEnabled,
  createCheckoutSession,
  createBillingPortalSession,
  getUserSubscription,
  PLANS,
  type PlanKey,
} from '../services/stripeService';

const router = express.Router();

// GET /api/subscriptions/status — current user's subscription
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sub = await getUserSubscription(req.userId!);
    const plan = (sub.plan ?? 'free') as PlanKey;
    const planInfo = PLANS[plan] ?? PLANS.free;
    const bonus = sub.status === 'active' ? planInfo.cashbackBonus : 0;

    res.json({
      plan,
      status: sub.status ?? 'active',
      current_period_end: sub.current_period_end ?? null,
      stripe_enabled: stripeEnabled(),
      cashback_bonus: bonus,
      plans: Object.entries(PLANS).map(([key, p]) => ({
        key,
        name: p.name,
        amountCents: p.amountCents,
        cashbackBonus: p.cashbackBonus,
        description: p.description,
        features: p.features,
      })),
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/checkout — create Stripe Checkout session
router.post('/checkout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!stripeEnabled()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const user = await dbGet('SELECT email, name FROM users WHERE id = ?', [req.userId]) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { plan = 'gold' } = req.body;
    const validPlans: PlanKey[] = ['silver', 'gold', 'platinum'];
    if (!validPlans.includes(plan as PlanKey)) {
      return res.status(400).json({ error: 'Invalid plan. Choose silver, gold, or platinum.' });
    }

    const currentSub = await getUserSubscription(req.userId!);
    const hasPaidPlan = currentSub.plan !== 'free' && currentSub.status === 'active' && currentSub.stripe_subscription_id;
    const previousSubscriptionId = hasPaidPlan ? currentSub.stripe_subscription_id : undefined;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await createCheckoutSession(
      req.userId!,
      user.email,
      user.name,
      `${frontendUrl}/subscription/success`,
      `${frontendUrl}/subscription/cancel`,
      plan as PlanKey,
      previousSubscriptionId
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/subscriptions/portal — create Stripe Billing Portal session
router.post('/portal', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!stripeEnabled()) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await createBillingPortalSession(
      req.userId!,
      `${frontendUrl}/profile`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
