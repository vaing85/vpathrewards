/**
 * CJ link refresh job.
 *
 * For every merchant that has a cj_advertiser_id, pulls the current CJ Link
 * Search results, picks the best link (automatic > text link > first available)
 * and stores it on the merchant. The raw payload is also persisted as JSON so
 * admins can inspect alternatives.
 *
 * The user-facing `offers.affiliate_link` is **never** modified — this job
 * only populates `merchants.cj_recommended_link`. Admins opt-in per offer by
 * copying the recommended link into the offer's affiliate_link via the admin
 * UI. This keeps user-visible tracking links under human control.
 */
import { dbAll, dbRun } from '../database';
import {
  fetchCjLinks,
  isCjConfigured,
  pickBestCjLink,
  type CjLinkRecord,
} from '../services/cjApi';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface CjLinkRefreshPayload {
  /** Only refresh this merchant id. Omit to refresh all CJ-linked merchants. */
  merchantId?: number;
  /** Fetch + diff but don't write. */
  dryRun?: boolean;
}

export interface CjLinkRefreshResult {
  merchantsConsidered: number;
  merchantsUpdated: number;
  merchantsWithoutLink: number;
  errors: string[];
}

const cjLinkRefreshJob: JobDefinition<CjLinkRefreshPayload, CjLinkRefreshResult> = {
  name: 'cj-link-refresh',

  async run(payload, _ctx?: JobContext): Promise<JobResult<CjLinkRefreshResult>> {
    const errors: string[] = [];
    let merchantsConsidered = 0;
    let merchantsUpdated = 0;
    let merchantsWithoutLink = 0;

    if (!isCjConfigured()) {
      return {
        ok: true,
        data: {
          merchantsConsidered: 0,
          merchantsUpdated: 0,
          merchantsWithoutLink: 0,
          errors: ['CJ not configured — skipping'],
        },
        meta: { skipped: 1 },
      };
    }

    try {
      const { merchantId, dryRun = false } = payload ?? {};

      const merchants = (await dbAll<{ id: number; cj_advertiser_id: string; cj_recommended_link: string | null }>(
        merchantId != null
          ? 'SELECT id, cj_advertiser_id, cj_recommended_link FROM merchants WHERE cj_advertiser_id IS NOT NULL AND id = ?'
          : 'SELECT id, cj_advertiser_id, cj_recommended_link FROM merchants WHERE cj_advertiser_id IS NOT NULL',
        merchantId != null ? [merchantId] : []
      ));

      merchantsConsidered = merchants.length;
      if (merchants.length === 0) {
        return {
          ok: true,
          data: { merchantsConsidered, merchantsUpdated, merchantsWithoutLink, errors },
          meta: { merchantsConsidered, merchantsUpdated },
        };
      }

      const advertiserIds = merchants.map(m => m.cj_advertiser_id);
      const response = await fetchCjLinks(advertiserIds);

      // Group links by advertiser for per-merchant selection.
      const linksByAdvertiser = new Map<string, CjLinkRecord[]>();
      for (const link of response.links) {
        if (!link.advertiserId) continue;
        const arr = linksByAdvertiser.get(link.advertiserId) ?? [];
        arr.push(link);
        linksByAdvertiser.set(link.advertiserId, arr);
      }

      for (const merchant of merchants) {
        try {
          const links = linksByAdvertiser.get(merchant.cj_advertiser_id) ?? [];
          if (links.length === 0) {
            merchantsWithoutLink++;
            continue;
          }

          const best = pickBestCjLink(links);
          if (!best?.clickUrl) {
            merchantsWithoutLink++;
            continue;
          }

          if (best.clickUrl === merchant.cj_recommended_link && !dryRun) {
            // Already up to date — still bump synced_at so admins can see the
            // job is running, but no need to count as updated.
            await dbRun(
              'UPDATE merchants SET cj_links_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
              [merchant.id]
            );
            continue;
          }

          if (dryRun) {
            merchantsUpdated++;
            continue;
          }

          await dbRun(
            `UPDATE merchants SET
               cj_recommended_link = ?,
               cj_link_raw = ?,
               cj_links_synced_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [best.clickUrl, JSON.stringify(links), merchant.id]
          );
          merchantsUpdated++;
        } catch (err) {
          errors.push(`merchant ${merchant.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return {
        ok: true,
        data: { merchantsConsidered, merchantsUpdated, merchantsWithoutLink, errors },
        meta: {
          merchantsConsidered,
          merchantsUpdated,
          merchantsWithoutLink,
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
        data: { merchantsConsidered, merchantsUpdated, merchantsWithoutLink, errors },
        meta: { merchantsConsidered, merchantsUpdated, merchantsWithoutLink },
      };
    }
  },
};

export default cjLinkRefreshJob;
