/**
 * CJ (Commission Junction) sync job.
 *
 * Pulls publisher commissions from CJ's GraphQL API for a recent window and
 * upserts each record into cj_commissions. Idempotent on cj_commission_id —
 * safe to re-run, will refresh action_status on records that move from "new"
 * to "locked" / "extended" / "closed" between runs.
 *
 * Skips cleanly if CJ env vars are not set (e.g. dev environments).
 */
import { dbAll, dbRun } from '../database';
import { fetchPublisherCommissions, isCjConfigured, type CjCommissionRecord } from '../services/cjApi';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface CjSyncPayload {
  /** How many days back to fetch. Defaults to 7. */
  lookbackDays?: number;
  /** Optional override for the end of the window (ISO-8601). Defaults to now. */
  beforePostingDate?: string;
}

export interface CjSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  linkedToMerchant: number;
  errors: string[];
}

const ISO = (d: Date) => d.toISOString();

const cjSyncJob: JobDefinition<CjSyncPayload, CjSyncResult> = {
  name: 'cj-sync',

  async run(payload, _ctx?: JobContext): Promise<JobResult<CjSyncResult>> {
    const errors: string[] = [];
    let fetched = 0;
    let inserted = 0;
    let updated = 0;
    let linkedToMerchant = 0;

    if (!isCjConfigured()) {
      return {
        ok: true,
        data: { fetched: 0, inserted: 0, updated: 0, linkedToMerchant: 0, errors: ['CJ not configured — skipping'] },
        meta: { skipped: 1 },
      };
    }

    try {
      const { lookbackDays = 7, beforePostingDate } = payload ?? {};
      const before = beforePostingDate ? new Date(beforePostingDate) : new Date();
      const since = new Date(before.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

      const response = await fetchPublisherCommissions(ISO(since), ISO(before));
      fetched = response.records.length;

      // Pre-load advertiser -> merchant mapping for this batch
      const advertiserIds = Array.from(new Set(response.records.map(r => r.advertiserId).filter(Boolean)));
      const merchantByAdvertiser = new Map<string, number>();
      if (advertiserIds.length > 0) {
        const rows = await dbAll<{ id: number; cj_advertiser_id: string }>(
          `SELECT id, cj_advertiser_id FROM merchants WHERE cj_advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`,
          advertiserIds
        );
        for (const r of rows) merchantByAdvertiser.set(r.cj_advertiser_id, r.id);
      }

      for (const rec of response.records) {
        try {
          const merchantId = merchantByAdvertiser.get(rec.advertiserId) ?? null;
          if (merchantId != null) linkedToMerchant++;
          const result = await upsertCommission(rec, merchantId);
          if (result === 'inserted') inserted++;
          else if (result === 'updated') updated++;
        } catch (err) {
          errors.push(`commission ${rec.commissionId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        ok: true,
        data: { fetched, inserted, updated, linkedToMerchant, errors },
        meta: { fetched, inserted, updated, linkedToMerchant, errorCount: errors.length },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        ok: false,
        error: message,
        data: { fetched, inserted, updated, linkedToMerchant, errors },
        meta: { fetched, inserted, updated },
      };
    }
  },
};

async function upsertCommission(rec: CjCommissionRecord, merchantId: number | null): Promise<'inserted' | 'updated'> {
  const existing = (await dbAll<{ id: number }>(
    'SELECT id FROM cj_commissions WHERE cj_commission_id = ?',
    [rec.commissionId]
  ))[0];

  const params = [
    rec.commissionId,
    rec.advertiserId ?? null,
    rec.advertiserName ?? null,
    rec.orderId ?? null,
    rec.saleAmountUsd ?? null,
    rec.pubCommissionAmountUsd ?? null,
    rec.actionStatus ?? null,
    rec.actionType ?? null,
    rec.eventDate ?? null,
    rec.postingDate ?? null,
    JSON.stringify(rec),
    merchantId,
  ];

  await dbRun(
    `INSERT INTO cj_commissions
       (cj_commission_id, advertiser_id, advertiser_name, order_id,
        sale_amount_usd, pub_commission_amount_usd, action_status, action_type,
        event_date, posting_date, raw_payload, merchant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cj_commission_id) DO UPDATE SET
       advertiser_name = excluded.advertiser_name,
       order_id = excluded.order_id,
       sale_amount_usd = excluded.sale_amount_usd,
       pub_commission_amount_usd = excluded.pub_commission_amount_usd,
       action_status = excluded.action_status,
       action_type = excluded.action_type,
       event_date = excluded.event_date,
       posting_date = excluded.posting_date,
       raw_payload = excluded.raw_payload,
       merchant_id = COALESCE(excluded.merchant_id, cj_commissions.merchant_id)`,
    params
  );

  return existing ? 'updated' : 'inserted';
}

export default cjSyncJob;
