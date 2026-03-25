/**
 * Stripe Connect service — creates Express connected accounts for users,
 * generates onboarding links, and initiates transfers for bank withdrawal payouts.
 */
import { stripe } from './stripeService';
import { dbGet, dbRun } from '../database';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Connected account management
// ---------------------------------------------------------------------------

/**
 * Returns the user's existing stripe_account_id, or creates a new Express
 * connected account and stores it on the user record.
 */
export async function getOrCreateConnectedAccount(userId: number): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');

  const user = await dbGet(
    'SELECT stripe_account_id, email, name FROM users WHERE id = ?',
    [userId]
  ) as { stripe_account_id?: string; email: string; name: string } | undefined;

  if (!user) throw new Error('User not found');
  if (user.stripe_account_id) return user.stripe_account_id;

  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    capabilities: { transfers: { requested: true } },
    metadata: { user_id: String(userId) },
  });

  await dbRun('UPDATE users SET stripe_account_id = ? WHERE id = ?', [account.id, userId]);
  return account.id;
}

/**
 * Generates a Stripe-hosted onboarding URL for a connected account.
 * After the user completes onboarding they are redirected back to the withdrawals page.
 */
export async function createOnboardingLink(accountId: string): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${FRONTEND_URL}/withdrawals?stripe_refresh=true`,
    return_url:  `${FRONTEND_URL}/withdrawals?stripe_connected=true`,
    type: 'account_onboarding',
  });

  return link.url;
}

/**
 * Returns the onboarding/capability status of a connected account.
 */
export async function getAccountStatus(accountId: string): Promise<{
  ready: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
}> {
  if (!stripe) throw new Error('Stripe is not configured');

  const account = await stripe.accounts.retrieve(accountId);
  return {
    ready:             !!(account.details_submitted && account.payouts_enabled),
    details_submitted: !!account.details_submitted,
    payouts_enabled:   !!account.payouts_enabled,
  };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/**
 * Transfers `amountDollars` from the platform's Stripe balance to the user's
 * connected account. Returns the transfer ID on success.
 */
export async function createTransfer(
  stripeAccountId: string,
  amountDollars:   number,
  withdrawalId:    number
): Promise<{ success: boolean; transferId?: string; error?: string }> {
  if (!stripe) return { success: false, error: 'Stripe is not configured' };

  try {
    const transfer = await stripe.transfers.create({
      amount:      Math.round(amountDollars * 100), // cents
      currency:    'usd',
      destination: stripeAccountId,
      metadata:    { withdrawal_id: String(withdrawalId) },
    });
    return { success: true, transferId: transfer.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Transfer failed' };
  }
}
