/**
 * CJ link refresh job — DORMANT.
 *
 * CJ's GraphQL Link Search service doesn't exist at any of the obvious
 * hostnames (link-search.api.cj.com, links.api.cj.com all return 404 / are
 * unreachable). The legacy REST link-search at
 *   https://link-search.api.cj.com/v2/link-search
 * still works but uses developer-key auth instead of the Personal Access
 * Token, which is a separate integration path we haven't built yet.
 *
 * This job is kept registered so the JOB_NAMES.CJ_LINK_REFRESH constant
 * stays stable, but currently returns a `skipped` result. To revive it,
 * either:
 *   1. Implement REST against the legacy endpoint with CJ_DEVELOPER_KEY
 *   2. Pull click URLs out of the products query on ads.api.cj.com (each
 *      product result includes a clickUrl), which works with the PAT but
 *      is wasteful — one product call per advertiser.
 */
import { cjLinkSearchIsAvailable } from '../services/cjApi';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface CjLinkRefreshPayload {
  merchantId?: number;
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

  async run(_payload, _ctx?: JobContext): Promise<JobResult<CjLinkRefreshResult>> {
    if (!cjLinkSearchIsAvailable) {
      return {
        ok: true,
        data: {
          merchantsConsidered: 0,
          merchantsUpdated: 0,
          merchantsWithoutLink: 0,
          errors: ['CJ Link Search GraphQL endpoint not available — job dormant'],
        },
        meta: { skipped: 1, dormant: 1 },
      };
    }
    // Unreachable until link search is wired up. Leaving the no-op so callers
    // get a predictable result instead of a thrown error.
    return {
      ok: true,
      data: { merchantsConsidered: 0, merchantsUpdated: 0, merchantsWithoutLink: 0, errors: [] },
      meta: { skipped: 1 },
    };
  },
};

export default cjLinkRefreshJob;
