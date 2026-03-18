/**
 * Payout processor job: process pending withdrawal requests (batch, gateway, status updates).
 * Run on a schedule or triggered after new withdrawal. Later: enqueue via Redis/BullMQ.
 */
import { dbAll, dbGet, dbRun } from '../database';
import { sendEmailToUser } from '../utils/emailService';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface PayoutProcessorPayload {
  /** Process only withdrawals with id in this list. Omit to process next batch of pending. */
  withdrawalIds?: number[];
  /** Max number of withdrawals to process in one run */
  limit?: number;
  /** If true, only mark as processing; do not call payout gateway */
  dryRun?: boolean;
}

export interface PayoutProcessorResult {
  processed: number;
  approved: number;
  failed: number;
  skipped: number;
  details: Array<{ id: number; status: string; error?: string }>;
}

// Placeholder: in production, call your payout gateway (Stripe, PayPal, bank API)
async function submitPayoutToGateway(
  _withdrawalId: number,
  _amount: number,
  _paymentMethod: string,
  _paymentDetails: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  // TODO: integrate payout provider
  return { success: true };
}

const payoutProcessorJob: JobDefinition<PayoutProcessorPayload, PayoutProcessorResult> = {
  name: 'payout-processor',

  async run(payload, _ctx?: JobContext): Promise<JobResult<PayoutProcessorResult>> {
    const { withdrawalIds, limit = 50, dryRun = false } = payload ?? {};
    const details: Array<{ id: number; status: string; error?: string }> = [];
    let processed = 0;
    let approved = 0;
    let failed = 0;
    let skipped = 0;

    try {
      let rows: Array<{ id: number; user_id: number; amount: number; payment_method: string; payment_details: string; status: string }>;

      if (withdrawalIds?.length) {
        const placeholders = withdrawalIds.map(() => '?').join(',');
        rows = (await dbAll(
          `SELECT id, user_id, amount, payment_method, payment_details, status FROM withdrawals WHERE id IN (${placeholders}) AND status = 'pending'`,
          withdrawalIds
        )) as typeof rows;
      } else {
        rows = (await dbAll(
          `SELECT id, user_id, amount, payment_method, payment_details, status FROM withdrawals WHERE status = 'pending' ORDER BY requested_at ASC LIMIT ?`,
          [limit]
        )) as typeof rows;
      }

      for (const w of rows) {
        processed++;
        if (dryRun) {
          details.push({ id: w.id, status: 'dry_run' });
          skipped++;
          continue;
        }

        const result = await submitPayoutToGateway(w.id, w.amount, w.payment_method, w.payment_details);

        if (result.success) {
          await dbRun(
            'UPDATE withdrawals SET status = ?, processed_at = datetime("now") WHERE id = ?',
            ['completed', w.id]
          );
          approved++;
          details.push({ id: w.id, status: 'completed' });

          const user = await dbGet('SELECT email, name FROM users WHERE id = ?', [w.user_id]) as { email: string; name: string } | undefined;
          if (user?.email) {
            sendEmailToUser(
              w.user_id,
              user.email,
              'withdrawalStatus',
              { name: user.name, amount: w.amount, status: 'completed' },
              'withdrawal'
            ).catch((err) => console.error('Payout job: failed to send completion email', err));
          }
        } else {
          await dbRun(
            'UPDATE withdrawals SET status = ?, admin_notes = ? WHERE id = ?',
            ['failed', result.error ?? 'Gateway error', w.id]
          );
          failed++;
          details.push({ id: w.id, status: 'failed', error: result.error });
        }
      }

      return {
        ok: true,
        data: { processed, approved, failed, skipped, details },
        meta: { processed, approved, failed, skipped }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: message,
        data: { processed, approved, failed, skipped, details },
        meta: { processed, approved, failed, skipped }
      };
    }
  }
};

export default payoutProcessorJob;
