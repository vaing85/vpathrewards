/**
 * Stripe Connect routes — user-facing endpoints for bank account onboarding.
 *
 * POST /api/stripe/connect/account-link  — create (or retrieve) connected account + return onboarding URL
 * GET  /api/stripe/connect/status        — return whether the user's account is fully onboarded
 */
import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbGet } from '../database';
import {
  getOrCreateConnectedAccount,
  createOnboardingLink,
  getAccountStatus,
} from '../services/stripeConnect';

const router = express.Router();

// POST /api/stripe/connect/account-link
// Creates a connected account (if one doesn't exist) and returns a Stripe-hosted onboarding URL.
router.post('/account-link', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const accountId = await getOrCreateConnectedAccount(req.userId!);
    const url = await createOnboardingLink(accountId);
    res.json({ url });
  } catch (err: any) {
    console.error('Stripe Connect account-link error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to create onboarding link' });
  }
});

// GET /api/stripe/connect/status
// Returns whether the user has a connected account and whether it is ready for payouts.
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet(
      'SELECT stripe_account_id FROM users WHERE id = ?',
      [req.userId]
    ) as { stripe_account_id?: string } | undefined;

    if (!user?.stripe_account_id) {
      return res.json({ connected: false, ready: false });
    }

    const status = await getAccountStatus(user.stripe_account_id);
    res.json({ connected: true, ...status });
  } catch (err: any) {
    console.error('Stripe Connect status error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to get account status' });
  }
});

export default router;
