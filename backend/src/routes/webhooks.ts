import express from 'express';
import { constructWebhookEvent, handleWebhookEvent } from '../services/stripeService';

const router = express.Router();

/**
 * POST /api/webhooks/stripe
 *
 * IMPORTANT: This route must receive the raw request body (Buffer), not parsed JSON.
 * The express.raw() middleware is applied in server.ts BEFORE express.json().
 *
 * In your Stripe Dashboard → Webhooks, point to:
 *   https://yourdomain.com/api/webhooks/stripe
 *
 * Events to enable:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const event = constructWebhookEvent(req.body as Buffer, signature);
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
});

export default router;
