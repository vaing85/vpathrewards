/**
 * CJ advertiser sync job.
 *
 * Pulls the publisher's ACTIVE advertiser contracts and **enriches** existing
 * merchants that an admin has already linked to a CJ advertiser. CJ's programs
 * API does NOT expose advertiser display names, so auto-creating new merchant
 * rows by name isn't possible — admins must:
 *   1. Look up the CJ advertiser ID in the CJ Member portal
 *   2. Set merchants.cj_advertiser_id on the matching row
 *   3. Let this job populate cj_max_commission_rate + cj_commission_terms
 *
 * Unmatched advertiser IDs returned by CJ are surfaced in the result so an
 * admin can see at a glance how many advertisers haven't been linked yet.
 *
 * The user-facing offers.cashback_rate is intentionally not modified —
 * cj_max_commission_rate is the gross rate CJ pays us; the user split is an
 * admin policy call.
 */
import { dbAll, dbRun } from '../database';
import {
  fetchJoinedAdvertisers,
  isCjConfigured,
  extractMaxCommissionRate,
  type CjAdvertiserRecord,
} from '../services/cjApi';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface CjAdvertiserSyncPayload {
  /** Dry run: fetch + diff but don't write. */
  dryRun?: boolean;
}

export interface CjAdvertiserSyncResult {
  fetched: number;
  enriched: number;
  unmatched: string[]; // advertiser IDs CJ returned that aren't on any merchant
  errors: string[];
}

const cjAdvertiserSyncJob: JobDefinition<CjAdvertiserSyncPayload, CjAdvertiserSyncResult> = {
  name: 'cj-advertiser-sync',

  async run(payload, _ctx?: JobContext): Promise<JobResult<CjAdvertiserSyncResult>> {
    const errors: string[] = [];
    let fetched = 0;
    let enriched = 0;
    const unmatched: string[] = [];

    if (!isCjConfigured()) {
      return {
        ok: true,
        data: { fetched: 0, enriched: 0, unmatched: [], errors: ['CJ not configured — skipping'] },
        meta: { skipped: 1 },
      };
    }

    try {
      const { dryRun = false } = payload ?? {};
      const response = await fetchJoinedAdvertisers();
      fetched = response.advertisers.length;

      // Pre-load existing CJ-linked merchants in one query.
      const advertiserIds = response.advertisers.map(a => a.advertiserId).filter(Boolean);
      const existingByAdvertiser = new Map<string, number>();
      if (advertiserIds.length > 0) {
        const rows = await dbAll<{ id: number; cj_advertiser_id: string }>(
          `SELECT id, cj_advertiser_id FROM merchants WHERE cj_advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`,
          advertiserIds
        );
        for (const r of rows) existingByAdvertiser.set(r.cj_advertiser_id, r.id);
      }

      for (const adv of response.advertisers) {
        const merchantId = existingByAdvertiser.get(adv.advertiserId);
        if (merchantId == null) {
          unmatched.push(adv.advertiserId);
          continue;
        }
        try {
          if (!dryRun) await enrichMerchant(adv, merchantId);
          enriched++;
        } catch (err) {
          errors.push(`advertiser ${adv.advertiserId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        ok: true,
        data: { fetched, enriched, unmatched, errors },
        meta: {
          fetched,
          enriched,
          unmatchedCount: unmatched.length,
          errorCount: errors.length,
          dryRun: dryRun ? 1 : 0,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        ok: false,
        error: message,
        data: { fetched, enriched, unmatched, errors },
        meta: { fetched, enriched, unmatchedCount: unmatched.length },
      };
    }
  },
};

async function enrichMerchant(adv: CjAdvertiserRecord, merchantId: number): Promise<void> {
  const maxRate = extractMaxCommissionRate(adv.programTerms);
  const termsJson = JSON.stringify(adv.programTerms ?? null);
  await dbRun(
    `UPDATE merchants SET
       cj_max_commission_rate = ?,
       cj_commission_terms = ?,
       cj_synced_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [maxRate, termsJson, merchantId]
  );
}

export default cjAdvertiserSyncJob;
