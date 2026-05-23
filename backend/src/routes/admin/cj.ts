/**
 * Admin endpoints for inspecting + curating CJ data on merchants.
 *
 * GET    /api/admin/cj/merchants                  — list all CJ-linked merchants
 *                                                   with their parsed per-action
 *                                                   rate breakdown
 * GET    /api/admin/cj/merchants/unlinked         — merchants that have no
 *                                                   cj_advertiser_id yet (so an
 *                                                   admin can link them)
 * PUT    /api/admin/cj/merchants/:id              — set/clear cj_advertiser_id
 *                                                   on a merchant
 */
import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';

const router = express.Router();

interface MerchantRow {
  id: number;
  name: string;
  category: string | null;
  cj_advertiser_id: string | null;
  cj_max_commission_rate: number | null;
  cj_max_fixed_usd: number | null;
  cj_commission_terms: string | null;
  cj_synced_at: string | null;
  offer_count?: number;
}

interface ActionBreakdown {
  action_name: string;
  max_percent: number | null;
  fixed_amounts: Array<{ currency: string | null; value: number }>;
}

interface MerchantWithCj {
  id: number;
  name: string;
  category: string | null;
  offer_count: number;
  cj_advertiser_id: string;
  cj_max_commission_rate: number | null;
  cj_max_fixed_usd: number | null;
  cj_synced_at: string | null;
  term_name: string | null;
  actions: ActionBreakdown[];
}

/**
 * Walk one parsed programTerms object and return a flat list of action
 * breakdowns. Defensive — returns an empty list if the shape doesn't match.
 */
function parseActionBreakdown(terms: unknown): { termName: string | null; actions: ActionBreakdown[] } {
  if (!terms || typeof terms !== 'object') return { termName: null, actions: [] };
  const t = terms as Record<string, unknown>;
  const termName = typeof t.name === 'string' ? t.name : null;
  const actionTerms = Array.isArray(t.actionTerms) ? t.actionTerms : [];
  const out: ActionBreakdown[] = [];

  for (const at of actionTerms as Array<Record<string, unknown>>) {
    const tracker = (at.actionTracker as Record<string, unknown>) || {};
    const actionName = typeof tracker.name === 'string' ? tracker.name : '(unnamed action)';
    const commissions = Array.isArray(at.commissions) ? (at.commissions as Array<Record<string, unknown>>) : [];

    let maxPct: number | null = null;
    const fixed: Array<{ currency: string | null; value: number }> = [];

    for (const c of commissions) {
      const rate = (c.rate as Record<string, unknown>) || {};
      const type = typeof rate.type === 'string' ? rate.type : '';
      const rawValue = rate.value;
      const value =
        typeof rawValue === 'number' ? rawValue :
        typeof rawValue === 'string' ? parseFloat(rawValue) : NaN;
      if (!Number.isFinite(value)) continue;

      if (/percent|%/i.test(type)) {
        if (maxPct == null || value > maxPct) maxPct = value;
      } else if (/fixed/i.test(type) && value > 0) {
        const currency = typeof rate.currency === 'string' ? rate.currency : null;
        fixed.push({ currency, value });
      }
    }

    out.push({ action_name: actionName, max_percent: maxPct, fixed_amounts: fixed });
  }

  return { termName, actions: out };
}

// List all CJ-linked merchants with parsed per-action breakdown.
router.get('/merchants', authenticateAdmin, async (_req: AdminRequest, res: express.Response) => {
  try {
    const rows = await dbAll<MerchantRow>(
      `SELECT m.id, m.name, m.category,
              m.cj_advertiser_id, m.cj_max_commission_rate, m.cj_max_fixed_usd,
              m.cj_commission_terms, m.cj_synced_at,
              (SELECT COUNT(*) FROM offers o WHERE o.merchant_id = m.id) AS offer_count
       FROM merchants m
       WHERE m.cj_advertiser_id IS NOT NULL
       ORDER BY m.cj_max_commission_rate DESC NULLS LAST,
                m.cj_max_fixed_usd DESC NULLS LAST,
                m.name`
    );

    const out: MerchantWithCj[] = rows.map((m) => {
      let parsed: { termName: string | null; actions: ActionBreakdown[] } = { termName: null, actions: [] };
      if (m.cj_commission_terms) {
        try {
          parsed = parseActionBreakdown(JSON.parse(m.cj_commission_terms));
        } catch {
          // Malformed JSON — return empty breakdown rather than 500.
        }
      }
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        offer_count: Number(m.offer_count ?? 0),
        cj_advertiser_id: m.cj_advertiser_id!,
        cj_max_commission_rate: m.cj_max_commission_rate,
        cj_max_fixed_usd: m.cj_max_fixed_usd,
        cj_synced_at: m.cj_synced_at,
        term_name: parsed.termName,
        actions: parsed.actions,
      };
    });

    res.json({ merchants: out });
  } catch (err) {
    console.error('CJ merchants list error:', err);
    res.status(500).json({ error: 'Failed to load CJ merchants' });
  }
});

// Merchants that have no CJ link yet — useful for the "link this merchant" UI.
router.get('/merchants/unlinked', authenticateAdmin, async (_req: AdminRequest, res: express.Response) => {
  try {
    const rows = await dbAll<{ id: number; name: string; category: string | null }>(
      `SELECT id, name, category FROM merchants
       WHERE cj_advertiser_id IS NULL
       ORDER BY LOWER(name)`
    );
    res.json({ merchants: rows });
  } catch (err) {
    console.error('CJ unlinked merchants error:', err);
    res.status(500).json({ error: 'Failed to load unlinked merchants' });
  }
});

// Update a merchant's CJ advertiser ID. Pass null/empty string to unlink.
router.put('/merchants/:id', authenticateAdmin, async (req: AdminRequest, res: express.Response) => {
  const merchantId = parseInt(req.params.id, 10);
  if (!Number.isFinite(merchantId)) {
    return res.status(400).json({ error: 'Invalid merchant id' });
  }

  const { cj_advertiser_id } = (req.body ?? {}) as { cj_advertiser_id?: string | null };
  let newValue: string | null;
  if (cj_advertiser_id === null || cj_advertiser_id === undefined || cj_advertiser_id === '') {
    newValue = null;
  } else if (typeof cj_advertiser_id === 'string' && /^\d+$/.test(cj_advertiser_id)) {
    newValue = cj_advertiser_id;
  } else {
    return res.status(400).json({ error: 'cj_advertiser_id must be numeric or null/empty to unlink' });
  }

  try {
    const merchant = await dbGet<{ id: number }>(
      'SELECT id FROM merchants WHERE id = ?', [merchantId]
    );
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    // Unlinking clears the enrichment fields too, so stale data doesn't linger.
    if (newValue === null) {
      await dbRun(
        `UPDATE merchants SET
           cj_advertiser_id = NULL,
           cj_max_commission_rate = NULL,
           cj_max_fixed_usd = NULL,
           cj_commission_terms = NULL,
           cj_synced_at = NULL
         WHERE id = ?`,
        [merchantId]
      );
    } else {
      await dbRun(
        'UPDATE merchants SET cj_advertiser_id = ? WHERE id = ?',
        [newValue, merchantId]
      );
    }

    const updated = await dbGet<MerchantRow>(
      `SELECT id, name, cj_advertiser_id, cj_max_commission_rate, cj_synced_at
       FROM merchants WHERE id = ?`,
      [merchantId]
    );
    res.json({ ok: true, merchant: updated });
  } catch (err) {
    console.error('CJ merchant update error:', err);
    res.status(500).json({ error: 'Failed to update merchant' });
  }
});

export default router;
