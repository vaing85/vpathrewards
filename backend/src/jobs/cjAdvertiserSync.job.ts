/**
 * CJ advertiser sync job.
 *
 * Pulls the publisher's joined CJ advertisers and reconciles them with the
 * local `merchants` table:
 *   - existing merchant (matched by cj_advertiser_id) → refresh CJ fields
 *   - new advertiser → INSERT with cj_auto_imported = 1 so an admin can
 *     review and curate before exposing to users
 *
 * The user-facing `offers.cashback_rate` is intentionally NOT touched here —
 * what we earn from CJ (cj_max_commission_rate) is gross; the split with
 * users is an admin policy call, not an automatic mapping.
 */
import { dbAll, dbGet, dbRun } from '../database';
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
  inserted: number;
  updated: number;
  errors: string[];
}

const cjAdvertiserSyncJob: JobDefinition<CjAdvertiserSyncPayload, CjAdvertiserSyncResult> = {
  name: 'cj-advertiser-sync',

  async run(payload, _ctx?: JobContext): Promise<JobResult<CjAdvertiserSyncResult>> {
    const errors: string[] = [];
    let fetched = 0;
    let inserted = 0;
    let updated = 0;

    if (!isCjConfigured()) {
      return {
        ok: true,
        data: { fetched: 0, inserted: 0, updated: 0, errors: ['CJ not configured — skipping'] },
        meta: { skipped: 1 },
      };
    }

    try {
      const { dryRun = false } = payload ?? {};
      const response = await fetchJoinedAdvertisers();
      fetched = response.advertisers.length;

      // Pre-load existing CJ-linked merchants in one query.
      const advertiserIds = response.advertisers.map(a => a.advertiserId).filter(Boolean);
      const existingByAdvertiser = new Map<string, { id: number }>();
      if (advertiserIds.length > 0) {
        const rows = await dbAll<{ id: number; cj_advertiser_id: string }>(
          `SELECT id, cj_advertiser_id FROM merchants WHERE cj_advertiser_id IN (${advertiserIds.map(() => '?').join(',')})`,
          advertiserIds
        );
        for (const r of rows) existingByAdvertiser.set(r.cj_advertiser_id, { id: r.id });
      }

      for (const adv of response.advertisers) {
        try {
          const result = await upsertAdvertiser(adv, existingByAdvertiser.get(adv.advertiserId)?.id ?? null, dryRun);
          if (result === 'inserted') inserted++;
          else if (result === 'updated') updated++;
        } catch (err) {
          errors.push(`advertiser ${adv.advertiserId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        ok: true,
        data: { fetched, inserted, updated, errors },
        meta: { fetched, inserted, updated, errorCount: errors.length, dryRun: dryRun ? 1 : 0 },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        ok: false,
        error: message,
        data: { fetched, inserted, updated, errors },
        meta: { fetched, inserted, updated },
      };
    }
  },
};

async function upsertAdvertiser(
  adv: CjAdvertiserRecord,
  existingMerchantId: number | null,
  dryRun: boolean
): Promise<'inserted' | 'updated' | 'skipped'> {
  const maxRate = extractMaxCommissionRate(adv.actions);
  const termsJson = JSON.stringify(adv.actions ?? null);
  const category = adv.primaryCategory?.parent ?? null;

  if (existingMerchantId != null) {
    if (dryRun) return 'updated';
    await dbRun(
      `UPDATE merchants SET
         cj_max_commission_rate = ?,
         cj_commission_terms = ?,
         cj_synced_at = CURRENT_TIMESTAMP,
         website_url = COALESCE(website_url, ?)
       WHERE id = ?`,
      [maxRate, termsJson, adv.programUrl, existingMerchantId]
    );
    return 'updated';
  }

  // Auto-imported merchants need a name; skip if CJ didn't return one.
  if (!adv.advertiserName) return 'skipped';

  // Guard against accidental duplicate by name (could be a user-created merchant
  // that hasn't been linked yet). Link instead of inserting a duplicate.
  const byName = await dbGet<{ id: number }>(
    'SELECT id FROM merchants WHERE LOWER(name) = LOWER(?) AND cj_advertiser_id IS NULL',
    [adv.advertiserName]
  );
  if (byName) {
    if (dryRun) return 'updated';
    await dbRun(
      `UPDATE merchants SET
         cj_advertiser_id = ?,
         cj_max_commission_rate = ?,
         cj_commission_terms = ?,
         cj_synced_at = CURRENT_TIMESTAMP,
         website_url = COALESCE(website_url, ?)
       WHERE id = ?`,
      [adv.advertiserId, maxRate, termsJson, adv.programUrl, byName.id]
    );
    return 'updated';
  }

  if (dryRun) return 'inserted';
  await dbRun(
    `INSERT INTO merchants
       (name, description, website_url, category,
        cj_advertiser_id, cj_max_commission_rate, cj_commission_terms,
        cj_auto_imported, cj_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
    [
      adv.advertiserName,
      null,
      adv.programUrl,
      category,
      adv.advertiserId,
      maxRate,
      termsJson,
    ]
  );
  return 'inserted';
}

export default cjAdvertiserSyncJob;
