/**
 * Affiliate sync job: pull offers/rates from affiliate network and reconcile with local offers.
 * Run on a schedule (e.g. hourly). Later: enqueue via Redis/BullMQ.
 */
import { dbAll, dbGet, dbRun } from '../database';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface AffiliateSyncPayload {
  /** Optional: sync only this merchant id. Omit to sync all. */
  merchantId?: number;
  /** Optional: dry run, no DB writes */
  dryRun?: boolean;
}

export interface AffiliateSyncResult {
  offersChecked: number;
  offersUpdated: number;
  offersDeactivated: number;
  errors: string[];
}

// Placeholder: in production, call your affiliate API (Impact, ShareASale, etc.)
async function fetchAffiliateOffers(_merchantId?: number): Promise<Array<{
  external_id: string;
  merchant_id: number;
  title: string;
  cashback_rate: number;
  affiliate_link: string;
  is_active: boolean;
}>> {
  // TODO: replace with real API client
  // const client = getAffiliateClient();
  // return client.getOffers(merchantId);
  return [];
}

const affiliateSyncJob: JobDefinition<AffiliateSyncPayload, AffiliateSyncResult> = {
  name: 'affiliate-sync',

  async run(payload, _ctx?: JobContext): Promise<JobResult<AffiliateSyncResult>> {
    const { merchantId, dryRun = false } = payload ?? {};
    const errors: string[] = [];
    let offersChecked = 0;
    let offersUpdated = 0;
    let offersDeactivated = 0;

    try {
      const remoteOffers = await fetchAffiliateOffers(merchantId);
      offersChecked = remoteOffers.length;

      if (dryRun) {
        return {
          ok: true,
          data: { offersChecked, offersUpdated: 0, offersDeactivated: 0, errors },
          meta: { dryRun: 1 }
        };
      }

      // Get local offers keyed by something we can match (e.g. affiliate_link or external id if we add it)
      const localOffers = await dbAll(
        merchantId
          ? 'SELECT id, merchant_id, title, cashback_rate, affiliate_link, is_active FROM offers WHERE merchant_id = ?'
          : 'SELECT id, merchant_id, title, cashback_rate, affiliate_link, is_active FROM offers',
        merchantId != null ? [merchantId] : []
      ) as Array<{ id: number; merchant_id: number; title: string; cashback_rate: number; affiliate_link: string; is_active: number }>;

      for (const remote of remoteOffers) {
        const local = localOffers.find(
          (o) => o.merchant_id === remote.merchant_id && (o.affiliate_link === remote.affiliate_link || o.title === remote.title)
        );
        if (local) {
          if (local.cashback_rate !== remote.cashback_rate || local.is_active !== (remote.is_active ? 1 : 0)) {
            await dbRun(
              'UPDATE offers SET cashback_rate = ?, is_active = ? WHERE id = ?',
              [remote.cashback_rate, remote.is_active ? 1 : 0, local.id]
            );
            offersUpdated++;
          }
        }
        // If remote says inactive and we have no local match, we could deactivate by URL; skip for now
      }

      // Deactivate offers that no longer exist in remote (optional: only if affiliate returns "all current")
      // For now we only update existing; full sync would require external_id on offers table.

      return {
        ok: true,
        data: { offersChecked, offersUpdated, offersDeactivated, errors },
        meta: { offersChecked, offersUpdated, offersDeactivated }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      return {
        ok: false,
        error: message,
        data: { offersChecked, offersUpdated, offersDeactivated, errors },
        meta: { offersChecked, offersUpdated, offersDeactivated }
      };
    }
  }
};

export default affiliateSyncJob;
