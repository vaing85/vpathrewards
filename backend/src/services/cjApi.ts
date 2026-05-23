/**
 * Commission Junction (CJ.com) GraphQL client.
 *
 * Auth uses a Personal Access Token (PAT) — set CJ_PERSONAL_ACCESS_TOKEN in
 * Railway env vars. CJ_PUBLISHER_ID is the numeric publisher / CID from the
 * developer portal. Both must be present for the client to work; absence is
 * surfaced via isCjConfigured() so the sync job can skip cleanly instead of
 * throwing on boot.
 */

const CJ_COMMISSIONS_ENDPOINT = 'https://commissions.api.cj.com/query';
// Advertiser relationships and commission terms live on the "programs" service.
// Discovered via schema introspection — CJ's docs are inconsistent about the
// hostname. The query field exposed here is `publisher.contracts`, which
// returns each advertiser relationship (status, commission terms, etc.).
const CJ_PROGRAMS_ENDPOINT = 'https://programs.api.cj.com/query';

export interface CjCommissionRecord {
  commissionId: string;
  advertiserId: string;
  advertiserName: string | null;
  orderId: string | null;
  saleAmountUsd: number | null;
  pubCommissionAmountUsd: number | null;
  actionStatus: string | null;
  actionType: string | null;
  eventDate: string | null;
  postingDate: string | null;
}

interface CjCommissionResponse {
  count: number;
  payloadComplete: boolean;
  records: CjCommissionRecord[];
}

/**
 * One advertiser relationship ("contract" in CJ's vocabulary).
 *
 * Note: CJ's programs API does NOT expose the advertiser's display name —
 * only the advertiser ID. To populate a merchant's name, look it up in the
 * CJ Member portal or the products API. This means cjAdvertiserSync can only
 * enrich existing merchants (matched by cj_advertiser_id), not auto-create
 * them by name.
 */
export interface CjAdvertiserRecord {
  advertiserId: string;
  status: string | null; // ACTIVE | CANCELLED | EXPIRED | PENDING_OFFER | PENDING_REVERSION
  startTime: string | null;
  endTime: string | null;
  // Raw program terms passthrough — actionTerms[].commissions[].rate.value
  // is the structured form of the commission rate.
  programTerms: unknown;
}

interface CjAdvertiserResponse {
  count: number;
  totalCount: number;
  advertisers: CjAdvertiserRecord[];
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_PERSONAL_ACCESS_TOKEN && process.env.CJ_PUBLISHER_ID);
}

async function cjQuery<T>(endpoint: string, query: string): Promise<T> {
  const token = process.env.CJ_PERSONAL_ACCESS_TOKEN;
  if (!token) throw new Error('CJ_PERSONAL_ACCESS_TOKEN not set');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CJ API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(`CJ GraphQL errors: ${json.errors.map(e => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('CJ GraphQL returned no data');
  return json.data;
}

/**
 * Fetch publisher commissions posted within the given window.
 * Dates must be ISO-8601 UTC strings.
 */
export async function fetchPublisherCommissions(
  sincePostingDate: string,
  beforePostingDate: string
): Promise<CjCommissionResponse> {
  const publisherId = process.env.CJ_PUBLISHER_ID;
  if (!publisherId) throw new Error('CJ_PUBLISHER_ID not set');

  const query = `
    {
      publisherCommissions(
        forPublishers: ["${publisherId}"]
        sincePostingDate: "${sincePostingDate}"
        beforePostingDate: "${beforePostingDate}"
      ) {
        count
        payloadComplete
        records {
          commissionId
          advertiserId
          advertiserName
          orderId
          saleAmountUsd
          pubCommissionAmountUsd
          actionStatus
          actionType
          eventDate
          postingDate
        }
      }
    }
  `;

  const data = await cjQuery<{ publisherCommissions: CjCommissionResponse }>(CJ_COMMISSIONS_ENDPOINT, query);
  return data.publisherCommissions;
}

/**
 * Fetch the publisher's advertiser contracts (relationships). By default
 * filters client-side for status === "ACTIVE" so callers only see live
 * relationships. Pass { allStatuses: true } to see everything (cancelled,
 * expired, etc.) — useful for cleaning up stale data.
 */
export async function fetchJoinedAdvertisers(
  opts: { allStatuses?: boolean; limit?: number } = {}
): Promise<CjAdvertiserResponse> {
  const publisherId = process.env.CJ_PUBLISHER_ID;
  if (!publisherId) throw new Error('CJ_PUBLISHER_ID not set');

  // CJ caps `limit` at 100. For accounts with more than 100 active contracts
  // we'd need to paginate via `offset`; leaving that for a follow-up if needed.
  const limit = Math.min(opts.limit ?? 100, 100);

  const query = `
    {
      publisher {
        contracts(publisherId: "${publisherId}", limit: ${limit}) {
          totalCount
          count
          resultList {
            startTime
            endTime
            status
            advertiserId
            programTerms {
              id
              name
              isDefault
              actionTerms {
                id
                actionTracker { id name type }
                commissions {
                  rank
                  rate { type value currency }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await cjQuery<{
    publisher: {
      contracts: {
        totalCount: number;
        count: number;
        resultList: Array<{
          startTime: string | null;
          endTime: string | null;
          status: string;
          advertiserId: string;
          programTerms: unknown;
        }>;
      };
    };
  }>(CJ_PROGRAMS_ENDPOINT, query);

  const all = data.publisher.contracts.resultList.map<CjAdvertiserRecord>((c) => ({
    advertiserId: c.advertiserId,
    status: c.status,
    startTime: c.startTime,
    endTime: c.endTime,
    programTerms: c.programTerms,
  }));

  const filtered = opts.allStatuses ? all : all.filter((a) => a.status === 'ACTIVE');

  return {
    totalCount: data.publisher.contracts.totalCount,
    count: filtered.length,
    advertisers: filtered,
  };
}

/**
 * Walk the raw programTerms payload and return the maximum percentage
 * commission rate (e.g. 8.5 for 8.5%). Defensive against schema drift —
 * returns null if no percentage rate is found rather than throwing.
 *
 * Looks for nodes shaped like CommissionRate: { type, value, currency? }
 * where `type` is the CJ enum (e.g. PERCENTAGE, FLAT) and `value` is a
 * BigDecimal serialized as string or number. Flat-rate commissions can't
 * be expressed as a single cashback % so they're skipped.
 */
export function extractMaxCommissionRate(programTerms: unknown): number | null {
  let max: number | null = null;

  const isPercentType = (t: unknown): boolean =>
    typeof t === 'string' && /percent|%/i.test(t);

  const toNumber = (v: unknown): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const n = parseFloat(v.replace('%', ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const walk = (node: unknown) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      // CommissionRate shape: { type, value, currency? }
      if ('type' in obj && 'value' in obj && isPercentType(obj.type)) {
        const num = toNumber(obj.value);
        if (num != null && (max == null || num > max)) max = num;
      }
      for (const v of Object.values(obj)) walk(v);
    }
  };

  walk(programTerms);
  return max;
}

// ─────────────────────────────────────────────────────────────────────────────
// Link Search — NOT YET WIRED.
//
// CJ no longer exposes a GraphQL Link Search endpoint at any of the obvious
// hostnames (link-search.api.cj.com, links.api.cj.com — both 404). The
// legacy REST link-search API at https://link-search.api.cj.com/v2/link-search
// is still available but uses developer-key auth, not the Personal Access
// Token, so it's a separate integration path.
//
// For now, link-refresh is a no-op. To revive it, either:
//   1. Add CJ_DEVELOPER_KEY env var and implement REST against the v2
//      link-search endpoint, OR
//   2. Pull click URLs out of products query on ads.api.cj.com (each product
//      includes a clickUrl), which works with the PAT but is wasteful.
// ─────────────────────────────────────────────────────────────────────────────
export const cjLinkSearchIsAvailable = false;
