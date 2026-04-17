import Stripe from 'stripe';
import { dbGet, dbRun } from '../database';

// ---------------------------------------------------------------------------
// Stripe client (gracefully disabled if key not set)
// ---------------------------------------------------------------------------

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null;

export const stripeEnabled = (): boolean => !!stripe;

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const PLANS = {
  free: {
    name: 'Free',
    priceId: '',
    amountCents: 0,       // $0/month
    cashbackBonus: 0,     // earn 1% (base offer rate)
    description: 'Standard cashback rates',
    features: ['1% cashback on all offers', 'Access to all offers', 'Withdrawal requests'],
  },
  bronze: {
    name: 'Bronze',
    priceId: process.env.STRIPE_BRONZE_PRICE_ID || '',
    amountCents: 499,     // $4.99/month
    cashbackBonus: 1.0,   // earn 2%
    description: 'Earn 2% cashback on all offers',
    features: ['2% cashback on all offers', 'All Free features', 'Priority email support'],
  },
  silver: {
    name: 'Silver',
    priceId: process.env.STRIPE_SILVER_PRICE_ID || '',
    amountCents: 999,     // $9.99/month
    cashbackBonus: 2.0,   // earn 3%
    description: 'Earn 3% cashback on all offers',
    features: ['3% cashback on all offers', 'All Bronze features', 'Early access to new offers'],
  },
  gold: {
    name: 'Gold',
    priceId: process.env.STRIPE_GOLD_PRICE_ID || '',
    amountCents: 1499,    // $14.99/month
    cashbackBonus: 3.0,   // earn 4%
    description: 'Earn 4% cashback on all offers',
    features: ['4% cashback on all offers', 'All Silver features', 'Exclusive gold offers'],
  },
  platinum: {
    name: 'Platinum',
    priceId: process.env.STRIPE_PLATINUM_PRICE_ID || '',
    amountCents: 1999,    // $19.99/month
    cashbackBonus: 4.0,   // earn 5%
    description: 'Earn 5% cashback on all offers',
    features: ['5% cashback on all offers', 'All Gold features', 'Dedicated support', 'Exclusive platinum offers'],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Price ID → plan name lookup */
export function getPlanByPriceId(priceId: string): PlanKey {
  for (const [key, plan] of Object.entries(PLANS)) {
    if ('priceId' in plan && plan.priceId === priceId) return key as PlanKey;
  }
  return 'free';
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

/** Get or create a Stripe customer for a user. Returns the customer ID. */
export async function getOrCreateCustomer(
  userId: number,
  email: string,
  name: string
): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');

  const sub = await dbGet<{ stripe_customer_id: string }>('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', [userId]);
  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId: String(userId) },
  });

  // Upsert subscription row with customer ID
  await dbRun(`
    INSERT INTO subscriptions (user_id, stripe_customer_id, plan, status)
    VALUES (?, ?, 'free', 'active')
    ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id
  `, [userId, customer.id]);

  return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  userId: number,
  email: string,
  name: string,
  successUrl: string,
  cancelUrl: string,
  plan: PlanKey = 'gold',
  previousSubscriptionId?: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error('Stripe is not configured');
  if (plan === 'free') throw new Error('Cannot checkout for free plan');

  const selectedPlan = PLANS[plan];
  if (!selectedPlan.priceId) throw new Error(`Price ID for ${plan} plan is not configured`);

  const customerId = await getOrCreateCustomer(userId, email, name);

  const metadata: Record<string, string> = {
    userId: String(userId),
    plan,
    isChangePlan: previousSubscriptionId ? 'true' : 'false',
  };
  if (previousSubscriptionId) {
    metadata.previousSubscriptionId = previousSubscriptionId;
  }

  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: { metadata },
  });
}

// ---------------------------------------------------------------------------
// Billing portal (manage / cancel subscription)
// ---------------------------------------------------------------------------

export async function createBillingPortalSession(
  userId: number,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) throw new Error('Stripe is not configured');

  const sub = await dbGet<{ stripe_customer_id: string }>('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?', [userId]);
  if (!sub?.stripe_customer_id) throw new Error('No Stripe customer found for this user');

  return stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: returnUrl,
  });
}

// ---------------------------------------------------------------------------
// Subscription status helpers
// ---------------------------------------------------------------------------

export async function getUserSubscription(userId: number): Promise<{ plan: string; status: string; current_period_end: string | null; [k: string]: unknown }> {
  const sub = await dbGet<{ plan: string; status: string; current_period_end: string | null }>('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
  return sub ?? { plan: 'free', status: 'active', current_period_end: null };
}

export async function getUserCashbackBonus(userId: number): Promise<number> {
  const sub = await getUserSubscription(userId);
  if (sub.status === 'active' && sub.plan in PLANS) {
    return PLANS[sub.plan as PlanKey].cashbackBonus;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Webhook event processing
// ---------------------------------------------------------------------------

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) throw new Error('Stripe is not configured');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = Number(session.metadata?.userId);
      if (!userId || session.mode !== 'subscription') break;

      const plan = session.metadata?.plan || 'gold';
      const isChangePlan = session.metadata?.isChangePlan === 'true';
      const previousSubscriptionId = session.metadata?.previousSubscriptionId;

      // If this is a plan change, refund the previous subscription's last invoice
      // and cancel it now that the new payment has been confirmed
      if (isChangePlan && previousSubscriptionId && stripe) {
        try {
          const invoices = await stripe.invoices.list({
            subscription: previousSubscriptionId,
            limit: 1,
          });
          const lastInvoice = invoices.data[0] as any;
          if (lastInvoice?.payment_intent && lastInvoice.amount_paid > 0) {
            const pi = typeof lastInvoice.payment_intent === 'string'
              ? lastInvoice.payment_intent
              : lastInvoice.payment_intent.id;
            await stripe.refunds.create({ payment_intent: pi });
          }
          await stripe.subscriptions.cancel(previousSubscriptionId);
        } catch (err) {
          console.error('Error refunding/canceling previous subscription:', err);
        }
      }

      await dbRun(`
        INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_start)
        VALUES (?, ?, ?, ?, 'active', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          stripe_customer_id     = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          plan                   = EXCLUDED.plan,
          status                 = 'active',
          current_period_start   = NOW(),
          updated_at             = NOW()
      `, [userId, session.customer as string, session.subscription as string, plan]);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = Number(subscription.metadata?.userId);
      if (!userId) break;

      // Determine plan from price ID
      const priceId = (subscription as any).items?.data?.[0]?.price?.id as string | undefined;
      const plan = subscription.status === 'active'
        ? (priceId ? getPlanByPriceId(priceId) : (subscription.metadata?.plan || 'gold'))
        : 'free';
      const periodEnd = (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null;

      await dbRun(`
        UPDATE subscriptions
        SET plan = ?, status = ?, current_period_end = ?, updated_at = NOW()
        WHERE stripe_subscription_id = ?
      `, [plan, subscription.status, periodEnd, subscription.id]);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await dbRun(`
        UPDATE subscriptions
        SET plan = 'free', status = 'canceled', stripe_subscription_id = NULL, current_period_end = NULL, updated_at = NOW()
        WHERE stripe_subscription_id = ?
      `, [subscription.id]);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSub = (invoice as any).subscription as string | null;
      if (invoiceSub) {
        await dbRun(`
          UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
          WHERE stripe_subscription_id = ?
        `, [invoiceSub]);
      }
      break;
    }

    // ------------------------------------------------------------------
    // Stripe Connect — transfer events for bank withdrawal payouts
    // ------------------------------------------------------------------
    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
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
      const reversal = event.data.object as any;
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
