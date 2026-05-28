/**
 * Offer-import CSV parsing & normalization (pure logic, no DB).
 *
 * Two input shapes are supported:
 *   - "native": the format the offer importer documents
 *       merchant_name, title, cashback_rate, affiliate_link, description, terms
 *   - "cj-raw":  the "Links" CSV that CJ Affiliate exports per advertiser
 *       ADVERTISER, NAME, DESCRIPTION, ..., CLICK URL, COUPON CODE, ADV_CID, ...
 *
 * For cj-raw we:
 *   - map CJ columns to the importer's internal shape,
 *   - carry ADV_CID through as cj_advertiser_id so the importer can auto-link
 *     newly-created merchants to CJ,
 *   - dedupe by normalized title within each merchant (CJ exports include the
 *     same promo many times as Banner + Text Link variants),
 *   - skip pure logo / advertiser-name banner rows (not real offers),
 *   - rewrite "Evergreen Link for X" → "Shop X" so the customer-facing title
 *     isn't CJ jargon,
 *   - leave cashback_rate empty — the importer derives the rate from the
 *     merchant's CJ data (cj_max_commission_rate / cj_max_fixed_usd).
 */

export type ImportFormat = 'native' | 'cj-raw';

export interface NormalizedImportRow {
  csvRow: number;
  merchant_name: string;
  title: string;
  /** Empty for cj-raw — derived at import time from merchant.cj_max_*. */
  cashback_rate: string;
  affiliate_link: string;
  description?: string;
  terms?: string;
  /** Populated for cj-raw so the importer can auto-link the merchant to CJ. */
  cj_advertiser_id?: string;
}

/**
 * Standards-compliant CSV cell parser. Handles quoted fields with embedded
 * commas, embedded newlines, and doubled "" to escape a literal quote — all
 * of which appear in CJ's Links exports.
 */
export function parseCsvCells(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    cur.push(field);
    field = '';
  };
  const pushRow = () => {
    rows.push(cur);
    cur = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { pushField(); i++; continue; }
    if (ch === '\r' || ch === '\n') {
      pushField();
      if (cur.length > 1 || cur[0] !== '') pushRow(); else cur = [];
      if (ch === '\r' && text[i + 1] === '\n') i += 2; else i++;
      continue;
    }
    field += ch; i++;
  }
  // Trailing field/row (file may not end with a newline)
  pushField();
  if (cur.length > 1 || (cur.length === 1 && cur[0] !== '')) pushRow();
  return rows;
}

const normHeader = (h: string): string => h.trim().toLowerCase().replace(/\s+/g, '_');

export function detectFormat(headers: string[]): ImportFormat {
  const set = new Set(headers.map(normHeader));
  // "ADVERTISER" is the unambiguous marker of a CJ Links export.
  return set.has('advertiser') ? 'cj-raw' : 'native';
}

// ─── Native format (existing behavior) ────────────────────────────────────────

function parseNativeRows(cells: string[][]): NormalizedImportRow[] {
  const headers = cells[0].map(normHeader);
  const rows: NormalizedImportRow[] = [];
  for (let i = 1; i < cells.length; i++) {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[i][idx] ?? '').trim(); });
    rows.push({
      csvRow: i,
      merchant_name: obj['merchant_name'] || obj['merchant'] || '',
      title: obj['title'] || obj['offer_title'] || '',
      cashback_rate: obj['cashback_rate'] || obj['rate'] || '',
      affiliate_link: obj['affiliate_link'] || obj['link'] || obj['url'] || '',
      description: obj['description'] || undefined,
      terms: obj['terms'] || undefined,
    });
  }
  return rows;
}

// ─── CJ-raw format ────────────────────────────────────────────────────────────

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
const normPromoSpacing = (s: string): string => s.replace(/Promo Code\s*:\s*/g, 'Promo Code: ');

function cleanText(s: string | undefined): string {
  if (!s) return '';
  return collapse(normPromoSpacing(stripTags(s)));
}

function dedupKey(title: string): string {
  return collapse(normPromoSpacing(title)).toLowerCase();
}

// Link-type preference when collapsing duplicates — pick the cleanest variant.
const PREF: Record<string, number> = { 'Text Link': 0, 'Evergreen Link': 1, 'Banner': 2 };

function parseCjRawRows(cells: string[][]): NormalizedImportRow[] {
  const headers = cells[0].map(normHeader);
  const col = (name: string): number => headers.indexOf(name);
  const iAdv = col('advertiser');
  const iName = col('name');
  const iDesc = col('description');
  const iClick = col('click_url');
  const iCoupon = col('coupon_code');
  const iAdvCid = col('adv_cid');
  const iLinkType = col('link_type');

  // Dedup map keyed by `${merchant}\x00${normTitle}`, value is the chosen row
  // plus its csv row index and link-type preference (lower = better).
  type Chosen = { rec: NormalizedImportRow; pref: number };
  const chosen = new Map<string, Chosen>();

  for (let i = 1; i < cells.length; i++) {
    const row = cells[i];
    const advertiser = collapse(row[iAdv] ?? '');
    const rawName = collapse(row[iName] ?? '');
    const description = cleanText(row[iDesc]);
    const clickUrl = collapse(row[iClick] ?? '');
    const coupon = collapse(row[iCoupon] ?? '');
    const advCid = collapse(row[iAdvCid] ?? '');
    const linkType = collapse(row[iLinkType] ?? '');

    if (!advertiser || !rawName || !clickUrl) continue;
    // Drop pure logo / bare-advertiser banner rows — not real offers.
    const nameLower = rawName.toLowerCase();
    if (nameLower === 'logo' || nameLower === advertiser.toLowerCase()) continue;
    if (description.toLowerCase() === 'logo') continue;

    // Evergreen = the generic store deep-link; surface as "Shop {advertiser}".
    const isEvergreen = linkType === 'Evergreen Link' || nameLower.startsWith('evergreen link');
    const title = isEvergreen ? `Shop ${advertiser}` : normPromoSpacing(rawName);
    const finalDesc = isEvergreen ? '' : description;

    const terms = coupon ? `Use code: ${coupon}` : '';

    const rec: NormalizedImportRow = {
      csvRow: i,
      merchant_name: advertiser,
      title,
      cashback_rate: '', // derived from merchant.cj_max_* at import
      affiliate_link: clickUrl,
      description: finalDesc || undefined,
      terms: terms || undefined,
      cj_advertiser_id: advCid || undefined,
    };

    const key = `${advertiser.toLowerCase()}\x00${dedupKey(title)}`;
    const pref = PREF[linkType] ?? 3;
    const prior = chosen.get(key);
    if (!prior || pref < prior.pref) chosen.set(key, { rec, pref });
  }
  // Sort by original csv row to keep output stable / human-readable.
  return Array.from(chosen.values())
    .sort((a, b) => a.rec.csvRow - b.rec.csvRow)
    .map((c) => c.rec);
}

// ─── Top-level dispatch ───────────────────────────────────────────────────────

export interface ParsedImport {
  format: ImportFormat;
  rows: NormalizedImportRow[];
}

export function parseImportCsv(text: string): ParsedImport {
  const cells = parseCsvCells(text);
  if (cells.length < 2) return { format: 'native', rows: [] };
  const headers = cells[0];
  const format = detectFormat(headers);
  const rows = format === 'cj-raw' ? parseCjRawRows(cells) : parseNativeRows(cells);
  return { format, rows };
}
