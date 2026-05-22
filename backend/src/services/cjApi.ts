/**
 * Commission Junction (CJ.com) GraphQL client.
 *
 * Auth uses a Personal Access Token (PAT) — set CJ_PERSONAL_ACCESS_TOKEN in
 * Railway env vars. CJ_PUBLISHER_ID is the numeric publisher / CID from the
 * developer portal. Both must be present for the client to work; absence is
 * surfaced via isCjConfigured() so the sync job can skip cleanly instead of
 * throwing on boot.
 */

const CJ_GRAPHQL_ENDPOINT = 'https://commissions.api.cj.com/query';

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

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_PERSONAL_ACCESS_TOKEN && process.env.CJ_PUBLISHER_ID);
}

async function cjQuery<T>(query: string): Promise<T> {
  const token = process.env.CJ_PERSONAL_ACCESS_TOKEN;
  if (!token) throw new Error('CJ_PERSONAL_ACCESS_TOKEN not set');

  const res = await fetch(CJ_GRAPHQL_ENDPOINT, {
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

  const data = await cjQuery<{ publisherCommissions: CjCommissionResponse }>(query);
  return data.publisherCommissions;
}
