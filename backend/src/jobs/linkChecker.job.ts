/**
 * Link checker job: verify all active offer affiliate URLs are still reachable.
 * Marks broken/expired links in the DB and notifies admin via email.
 * Run daily via node-cron.
 */
import { dbAll, dbRun } from '../database';
import { sendAdminNotification } from '../utils/emailService';
import { startProgress, incrementProgress, clearProgress } from './progress';
import type { JobContext, JobDefinition, JobResult } from './types';

export interface LinkCheckerPayload {
  /** Check only a specific offer by ID */
  offerId?: number;
  /** If true, do not update DB or send email */
  dryRun?: boolean;
}

export interface LinkCheckerResult {
  total: number;
  ok: number;
  broken: number;
  expired: number;
  unknown: number;
  brokenOffers: Array<{ id: number; title: string; url: string; reason: string }>;
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// CJ affiliate tracking domains — links that START here are CJ affiliate links
const CJ_TRACKING_DOMAINS = [
  'anrdoezrs.net', 'tkqlhce.com', 'dpbolvw.net', 'jdoqocy.com',
  'kqzyfj.com', 'lduhtrk.com', 'qksrv.net', 'yceml.net',
  'awltovhc.com', 'emjcd.com', 'ftjcfx.com', 'ojrq.net',
  'pntrs.com', 'pxlwd.com', 'rzlt.io', 'tqlkg.com',
  'xhpkr.com', 'xjvst.com', 'zkdas.com',
];

// CJ error/deactivated domains — if we END UP here after redirect, link is broken
const CJ_ERROR_DOMAINS = [
  'cj.com', 'commission.junction.com', 'cj-sandbox.com',
  ...CJ_TRACKING_DOMAINS,
];

async function checkUrl(url: string): Promise<{ status: 'ok' | 'broken' | 'unknown'; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const finalUrl = response.url;
    const isCjOrigin = CJ_TRACKING_DOMAINS.some(d => url.includes(d));

    // If final URL landed on a CJ domain after redirect, the link is deactivated
    // Exception: if the link started AND ended on a CJ tracking domain with a non-error
    // status, mark as unknown (CJ may require browser/cookies to fully resolve)
    if (CJ_ERROR_DOMAINS.some(domain => finalUrl.includes(domain))) {
      if (isCjOrigin && response.status < 400) {
        return { status: 'unknown', reason: 'CJ encrypted link — could not verify final destination (requires browser)' };
      }
      return { status: 'broken', reason: 'Redirected to CJ error page — link deactivated' };
    }

    // 429 = rate-limited — cannot confirm broken, mark as unknown for any link
    if (response.status === 429) {
      return { status: 'unknown', reason: `Rate-limited (429) at ${finalUrl} — cannot confirm broken` };
    }

    // CJ link reached a real merchant domain but got 403 — merchant is blocking bots.
    // The link itself is still active; mark as unknown rather than broken.
    if (response.status === 403) {
      return { status: 'unknown', reason: `Bot-blocked (403) at ${finalUrl} — cannot confirm broken` };
    }

    if (response.status === 404) {
      // CJ links returning 404 may just be bot-blocking — real page works in browser
      if (isCjOrigin) {
        return { status: 'unknown', reason: `Bot-blocked 404 at ${finalUrl} — cannot confirm broken` };
      }
      return { status: 'broken', reason: `404 Not Found at ${finalUrl}` };
    }

    if (response.status >= 400) {
      return { status: 'broken', reason: `HTTP ${response.status} at ${finalUrl}` };
    }

    return { status: 'ok' };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      return { status: 'unknown', reason: 'Request timed out after 15s' };
    }
    return { status: 'unknown', reason: err?.message || 'Network error' };
  }
}

const linkCheckerJob: JobDefinition<LinkCheckerPayload, LinkCheckerResult> = {
  name: 'link-checker',

  async run(payload: LinkCheckerPayload = {}, _ctx?: JobContext): Promise<JobResult<LinkCheckerResult>> {
    const { dryRun = false, offerId } = payload;

    // Also include inactive offers that were previously marked broken/unknown
    // so they can be re-checked and potentially restored
    const query = offerId
      ? 'SELECT id, title, affiliate_link, end_date FROM offers WHERE id = $1'
      : "SELECT id, title, affiliate_link, end_date FROM offers WHERE is_active = 1 OR link_status IN ('broken', 'unknown')";

    const params = offerId ? [offerId] : [];
    const offers = await dbAll(query, params) as Array<{
      id: number;
      title: string;
      affiliate_link: string;
      end_date: string | null;
    }>;

    const result: LinkCheckerResult = {
      total: offers.length,
      ok: 0,
      broken: 0,
      expired: 0,
      unknown: 0,
      brokenOffers: [],
    };

    startProgress('link-checker', offers.length);

    let lastDomain = '';

    for (const offer of offers) {
      const now = new Date();

      // Check end_date expiry first
      if (offer.end_date && new Date(offer.end_date) < now) {
        result.expired++;
        result.brokenOffers.push({
          id: offer.id,
          title: offer.title,
          url: offer.affiliate_link,
          reason: `Expired on ${offer.end_date}`,
        });

        if (!dryRun) {
          await dbRun(
            'UPDATE offers SET link_status = $1, link_last_checked = NOW(), link_error = $2, is_active = 0 WHERE id = $3',
            ['expired', `Expired on ${offer.end_date}`, offer.id]
          );
        }
        continue;
      }

      // Check the URL
      const check = await checkUrl(offer.affiliate_link);

      if (!dryRun) {
        // ok → active, broken → inactive, unknown → restore to active (benefit of the doubt)
        const isActive = check.status === 'broken' ? 0 : 1;
        await dbRun(
          'UPDATE offers SET link_status = $1, link_last_checked = NOW(), link_error = $2, is_active = $3 WHERE id = $4',
          [check.status, check.reason || null, isActive, offer.id]
        );
      }

      if (check.status === 'ok') {
        result.ok++;
      } else if (check.status === 'broken') {
        result.broken++;
        result.brokenOffers.push({
          id: offer.id,
          title: offer.title,
          url: offer.affiliate_link,
          reason: check.reason || 'Broken link',
        });
      } else {
        result.unknown++;
      }

      incrementProgress();

      // Delay between requests — 2s normally, 4s if same domain was just checked
      const offerDomain = (() => { try { return new URL(offer.affiliate_link).hostname; } catch { return ''; } })();
      const delay = offerDomain === lastDomain ? 4000 : 2000;
      lastDomain = offerDomain;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    clearProgress();

    // Send admin notification if any broken/expired links found
    if (!dryRun && result.brokenOffers.length > 0) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        await sendAdminNotification(adminEmail, 'brokenLinks', {
          brokenCount: result.broken + result.expired,
          offers: result.brokenOffers,
          checkedAt: new Date().toLocaleString(),
        }).catch(err => console.error('Failed to send admin notification:', err));
      }
    }

    console.log(`[link-checker] Done — total: ${result.total}, ok: ${result.ok}, broken: ${result.broken}, expired: ${result.expired}, unknown: ${result.unknown}`);

    return { ok: true, data: result };
  },
};

export default linkCheckerJob;
