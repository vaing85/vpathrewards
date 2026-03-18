/**
 * Tracking / transaction reconciliation job: align cashback_transactions and conversions
 * with affiliate network reporting (confirm or reject pending items).
 * Run on a schedule. Later: enqueue via Redis/BullMQ.
 */
import { dbAll, dbGet, dbRun } from '../database';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface TrackingProcessorPayload {
  /** Reconcile only transactions for this offer id. Omit for all pending. */
  offerId?: number;
  /** Max conversions and transactions to process per run */
  limit?: number;
  /** If true, no DB updates */
  dryRun?: boolean;
}

export interface TrackingProcessorResult {
  conversionsChecked: number;
  conversionsConfirmed: number;
  conversionsRejected: number;
  transactionsChecked: number;
  transactionsConfirmed: number;
  transactionsRejected: number;
  errors: string[];
}

// Placeholder: in production, fetch reported conversions/transactions from affiliate API
async function fetchReportedConversionIds(_offerId?: number): Promise<Set<string>> {
  // TODO: e.g. return Set of order_id or (session_id + order_id) that affiliate reports as approved
  return new Set();
}

async function fetchReportedTransactionIds(_offerId?: number): Promise<Set<number>> {
  // TODO: if affiliate gives us transaction ids, return them
  return new Set();
}

const trackingProcessorJob: JobDefinition<TrackingProcessorPayload, TrackingProcessorResult> = {
  name: 'tracking-processor',

  async run(payload, _ctx?: JobContext): Promise<JobResult<TrackingProcessorResult>> {
    const { offerId, limit = 200, dryRun = false } = payload ?? {};
    const errors: string[] = [];
    let conversionsChecked = 0;
    let conversionsConfirmed = 0;
    let conversionsRejected = 0;
    let transactionsChecked = 0;
    let transactionsConfirmed = 0;
    let transactionsRejected = 0;

    try {
      const reportedConversionKeys = await fetchReportedConversionIds(offerId);
      const reportedTxIds = await fetchReportedTransactionIds(offerId);

      // 1) Reconcile conversions: pending -> confirmed/rejected based on affiliate data
      const pendingConversions = await dbAll(
        offerId
          ? 'SELECT id, click_id, session_id, order_id, offer_id FROM conversions WHERE status = ? AND offer_id = ? LIMIT ?'
          : 'SELECT id, click_id, session_id, order_id, offer_id FROM conversions WHERE status = ? LIMIT ?',
        offerId != null ? ['pending', offerId, limit] : ['pending', limit]
      ) as Array<{ id: number; click_id: number; session_id: string; order_id: string | null; offer_id: number }>;

      for (const c of pendingConversions) {
        conversionsChecked++;
        const key = [c.session_id, c.order_id ?? ''].join('|');
        const reported = reportedConversionKeys.has(key) || reportedConversionKeys.size === 0;
        if (dryRun) continue;
        if (reported) {
          await dbRun('UPDATE conversions SET status = ? WHERE id = ?', ['confirmed', c.id]);
          conversionsConfirmed++;
        } else {
          // Optional: only reject if we have a positive set of reported ids (avoid rejecting everything when API is empty)
          if (reportedConversionKeys.size > 0) {
            await dbRun('UPDATE conversions SET status = ? WHERE id = ?', ['rejected', c.id]);
            conversionsRejected++;
          }
        }
      }

      // 2) Reconcile cashback_transactions: pending -> confirmed/rejected
      const pendingTx = await dbAll(
        offerId
          ? 'SELECT id, user_id, offer_id, amount FROM cashback_transactions WHERE status = ? AND offer_id = ? LIMIT ?'
          : 'SELECT id, user_id, offer_id, amount FROM cashback_transactions WHERE status = ? LIMIT ?',
        offerId != null ? ['pending', offerId, limit] : ['pending', limit]
      ) as Array<{ id: number; user_id: number; offer_id: number; amount: number }>;

      for (const tx of pendingTx) {
        transactionsChecked++;
        const reported = reportedTxIds.has(tx.id) || reportedTxIds.size === 0;
        if (dryRun) continue;
        if (reported) {
          await dbRun('UPDATE cashback_transactions SET status = ? WHERE id = ?', ['confirmed', tx.id]);
          transactionsConfirmed++;
        } else {
          if (reportedTxIds.size > 0) {
            await dbRun('UPDATE cashback_transactions SET status = ? WHERE id = ?', ['rejected', tx.id]);
            await dbRun('UPDATE users SET total_earnings = max(0, total_earnings - ?) WHERE id = ?', [tx.amount, tx.user_id]);
            transactionsRejected++;
          }
        }
      }

      return {
        ok: true,
        data: {
          conversionsChecked,
          conversionsConfirmed,
          conversionsRejected,
          transactionsChecked,
          transactionsConfirmed,
          transactionsRejected,
          errors
        },
        meta: {
          conversionsChecked,
          conversionsConfirmed,
          conversionsRejected,
          transactionsChecked,
          transactionsConfirmed,
          transactionsRejected
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        ok: false,
        error: message,
        data: {
          conversionsChecked,
          conversionsConfirmed,
          conversionsRejected,
          transactionsChecked,
          transactionsConfirmed,
          transactionsRejected,
          errors
        },
        meta: {
          conversionsChecked,
          conversionsConfirmed,
          conversionsRejected,
          transactionsChecked,
          transactionsConfirmed,
          transactionsRejected
        }
      };
    }
  }
};

export default trackingProcessorJob;
