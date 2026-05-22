/**
 * Stripe service — webhook plumbing for the Stripe Connect payout flow.
 *
 * Post-pivot to free commission-share tiers, this file no longer handles paid
 * subscriptions. Connected-account onboarding lives in services/stripeConnect.ts;
 * transfer events for member cashback payouts are processed in handleWebhookEvent
 * below.
 */
import Stripe from 'stripe';
import { dbGet, dbRun } from '../database';

// ---------------------------------------------------------------------------
// Stripe client (gracefully disabled if key not set)
// ---------------------------------------------------------------------------

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

export const stripeEnabled = (): boolean => !!stripe;

// ---------------------------------------------------------------------------
// Webhook event processing
// ---------------------------------------------------------------------------

export function constructWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new Error('Stripe is not configured');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// Event union inferred from the SDK. stripe-node v22 reshaped its type
// exports so `Stripe.Event` isn't available on the default import anymore;
// using ReturnType pulls the proper discriminated-union event type without
// reaching into the SDK's internal type paths.
type StripeWebhookEvent = ReturnType<typeof constructWebhookEvent>;

export async function handleWebhookEvent(event: StripeWebhookEvent): Promise<void> {
  switch (event.type) {
    // ------------------------------------------------------------------
    // Stripe Connect — transfer events for bank withdrawal payouts
    // ------------------------------------------------------------------
    case 'transfer.created': {
      const transfer = event.data.object;
      const withdrawalId = Number(transfer.metadata?.withdrawal_id);
      if (!withdrawalId) break;
      // Mark as completed and deduct from user balance (idempotent: skip if already completed)
      const existing = await dbGet(
        'SELECT status, user_id, amount FROM withdrawals WHERE id = ?',
        [withdrawalId]
      ) as { status: string; user_id: number; amount: number } | undefined;
      if (existing && existing.status !== 'completed') {
        await dbRun(
          `UPDATE withdrawals SET status = 'completed', admin_notes = ?, processed_at = NOW() WHERE id = ?`,
          [`Stripe transfer: ${transfer.id}`, withdrawalId]
        );
        await dbRun(
          'UPDATE users SET total_earnings = total_earnings - ? WHERE id = ?',
          [existing.amount, existing.user_id]
        );
      }
      break;
    }

    case 'transfer.reversed': {
      const reversal = event.data.object;
      const withdrawalId = Number(reversal.metadata?.withdrawal_id);
      if (!withdrawalId) break;
      await dbRun(
        `UPDATE withdrawals SET status = 'failed', admin_notes = ? WHERE id = ? AND status = 'processing'`,
        [`Stripe transfer reversed: ${reversal.id}`, withdrawalId]
      );
      break;
    }

    case 'account.updated': {
      // Connected account completed onboarding — no DB action needed,
      // frontend polls /api/stripe/connect/status on return.
      break;
    }

    default:
      // Unhandled event — safe to ignore
      break;
  }
}
