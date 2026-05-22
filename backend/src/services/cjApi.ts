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
const CJ_ADVERTISER_LOOKUP_ENDPOINT = 'https://advertiser-lookup.api.cj.com/query';

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

export interface CjAdvertiserRecord {
  advertiserId: string;
  advertiserName: string | null;
  programUrl: string | null;
  networkRank: number | null;
  relationshipStatus: string | null;
  primaryCategory: { parent: string | null; child: string | null } | null;
  // Raw passthrough so the job can store full terms as JSON without losing data.
  actions: unknown;
}

interface CjAdvertiserResponse {
  count: number;
  payloadComplete: boolean;
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
 * Fetch advertisers the publisher has joined (i.e. has an active relationship
 * with). Returns the raw `actions` payload so the caller can store full
 * commission terms as JSON.
 *
 * Note: CJ's GraphQL schema for advertiser lookup has gone through revisions
 * over the years. If field names differ on your account, adjust the query
 * below rather than the response shape — extractMaxCommissionRate() walks
 * the raw `actions` defensively so it tolerates minor schema variation.
 */
export async function fetchJoinedAdvertisers(): Promise<CjAdvertiserResponse> {
  const publisherId = process.env.CJ_PUBLISHER_ID;
  if (!publisherId) throw new Error('CJ_PUBLISHER_ID not set');

  const query = `
    {
      advertiserLookup(
        requestId: "${publisherId}"
        advertiserIds: "joined"
      ) {
        count
        payloadComplete
        advertisers {
          advertiserId
          advertiserName
          programUrl
          networkRank
          relationshipStatus
          primaryCategory {
            parent
            child
          }
          actions {
            id
            name
            type
            commissions {
              itemList {
                rate
                type
              }
            }
          }
        }
      }
    }
  `;

  const data = await cjQuery<{ advertiserLookup: CjAdvertiserResponse }>(CJ_ADVERTISER_LOOKUP_ENDPOINT, query);
  return data.advertiserLookup;
}

/**
 * Walk the raw CJ `actions` payload and return the maximum commission rate
 * (as a percentage, e.g. 8.5). Defensive against schema drift — returns null
 * if no numeric rate is found rather than throwing.
 *
 * CJ rates can be percentages ("8.50%") or flat amounts ("$5.00"). Only
 * percentage rates are returned; flat amounts can't be expressed as a single
 * cashback %.
 */
export function extractMaxCommissionRate(actions: unknown): number | null {
  let max: number | null = null;

  const walk = (node: unknown) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      const rate = obj.rate;
      const type = obj.type;
      if (typeof rate === 'string' && (type === 'percentage' || type === 'PERCENTAGE' || type === '%')) {
        const num = parseFloat(rate.replace('%', ''));
        if (!Number.isNaN(num) && (max == null || num > max)) max = num;
      } else if (typeof rate === 'number' && (type === 'percentage' || type === 'PERCENTAGE' || type === '%')) {
        if (max == null || rate > max) max = rate;
      }
      for (const v of Object.values(obj)) walk(v);
    }
  };

  walk(actions);
  return max;
}
