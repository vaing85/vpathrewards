import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { validateOffer, validateId } from '../../middleware/validation';
import { sendNewOfferAlerts } from '../../utils/emailService';
import { parseImportCsv, type ImportFormat, type NormalizedImportRow } from '../../services/offerImport';

const router = express.Router();

// ─── Bulk CSV Import ──────────────────────────────────────────────────────────
//
// Two input shapes are supported (auto-detected — see services/offerImport.ts):
//   - "native":  merchant_name, title, cashback_rate, affiliate_link, ...
//   - "cj-raw":  the Links CSV CJ Affiliate exports per advertiser. The CSV
//                doesn't carry a cashback rate; we derive it from the merchant's
//                cj_max_commission_rate / cj_max_fixed_usd (populated by the CJ
//                advertiser sync). Merchants are auto-linked via ADV_CID.

interface ImportRow extends NormalizedImportRow {}

interface ImportResult {
  row: number;
  status: 'imported' | 'skipped' | 'error';
  title: string;
  merchant_name: string;
  reason?: string;
}

interface MerchantRow {
  id: number;
  name: string;
  cj_advertiser_id: string | null;
  cj_max_commission_rate: number | null;
  cj_max_fixed_usd: number | null;
}

// Decide cashback_rate / cashback_fixed_usd for one row, given the format
// and the merchant's current CJ data (which may be null if not synced yet).
// Returns null for rate fields that should be left at zero/null.
function deriveOfferRate(
  format: ImportFormat,
  row: ImportRow,
  merchant: MerchantRow | null
): { cashback_rate: number; cashback_fixed_usd: number | null; source: 'cj-fixed' | 'cj-rate' | 'csv' | 'none' } {
  if (format === 'cj-raw') {
    if (merchant?.cj_max_fixed_usd && merchant.cj_max_fixed_usd > 0) {
      return { cashback_rate: 0, cashback_fixed_usd: merchant.cj_max_fixed_usd, source: 'cj-fixed' };
    }
    if (merchant?.cj_max_commission_rate && merchant.cj_max_commission_rate > 0) {
      return { cashback_rate: merchant.cj_max_commission_rate, cashback_fixed_usd: null, source: 'cj-rate' };
    }
    return { cashback_rate: 0, cashback_fixed_usd: null, source: 'none' };
  }
  const r = parseFloat(row.cashback_rate);
  return { cashback_rate: isNaN(r) ? 0 : r, cashback_fixed_usd: null, source: isNaN(r) ? 'none' : 'csv' };
}

// POST /api/admin/offers/preview — validate CSV rows (no DB writes)
router.post('/preview', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { csv } = req.body as { csv: string };
    if (!csv) return res.status(400).json({ error: 'csv field is required' });

    const { format, rows } = parseImportCsv(csv);
    if (rows.length === 0) return res.status(400).json({ error: 'No data rows found. Check your CSV format.' });

    const merchants = await dbAll<MerchantRow>(
      'SELECT id, name, cj_advertiser_id, cj_max_commission_rate, cj_max_fixed_usd FROM merchants'
    );
    const merchantByName = new Map(merchants.map((m) => [m.name.toLowerCase(), m]));

    const existingLinks = new Set(
      (await dbAll<{ affiliate_link: string }>('SELECT affiliate_link FROM offers')).map((o) => o.affiliate_link)
    );

    const preview = rows.map((row) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const name = (row.merchant_name ?? '').trim();
      const merchant = name ? merchantByName.get(name.toLowerCase()) ?? null : null;
      const willCreateMerchant = !!name && !merchant;

      if (!name) errors.push('merchant_name missing');
      if (!row.title) errors.push('title missing');
      if (!row.affiliate_link) errors.push('affiliate_link missing');

      const { cashback_rate, cashback_fixed_usd, source } = deriveOfferRate(format, row, merchant);

      if (format === 'native' && source === 'none') {
        errors.push('invalid cashback_rate');
      } else if (format === 'cj-raw' && source === 'none') {
        warnings.push(
          willCreateMerchant
            ? 'Rate will populate after CJ advertiser sync runs on the new merchant'
            : 'Merchant has no CJ rate yet — run CJ advertiser sync to populate'
        );
      }

      const duplicate = row.affiliate_link && existingLinks.has(row.affiliate_link);

      return {
        row: row.csvRow,
        merchant_name: name,
        title: row.title,
        cashback_rate: cashback_rate || '',
        cashback_fixed_usd,
        affiliate_link: row.affiliate_link,
        description: row.description,
        terms: row.terms,
        cj_advertiser_id: row.cj_advertiser_id,
        status: errors.length > 0 ? 'error' : duplicate ? 'duplicate' : 'ready',
        will_create_merchant: willCreateMerchant,
        rate_source: source,
        warnings,
        errors,
      };
    });

    res.json({ format, preview, total: preview.length });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/offers/import — bulk insert validated rows
router.post('/import', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { rows, format = 'native' } = req.body as {
      rows: ImportRow[];
      format?: ImportFormat;
    };

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: 'rows array is required' });

    const merchants = await dbAll<MerchantRow>(
      'SELECT id, name, cj_advertiser_id, cj_max_commission_rate, cj_max_fixed_usd FROM merchants'
    );
    const merchantByName = new Map(merchants.map((m) => [m.name.toLowerCase(), m]));

    const existingLinks = new Set(
      (await dbAll<{ affiliate_link: string }>('SELECT affiliate_link FROM offers')).map((o) => o.affiliate_link)
    );

    const results: ImportResult[] = [];
    const createdMerchants: string[] = [];

    for (const row of rows) {
      const name = row.merchant_name?.trim() ?? '';
      const cjAdvId = row.cj_advertiser_id?.trim() || null;

      if (!name || !row.title || !row.affiliate_link) {
        results.push({ row: row.csvRow, status: 'error', title: row.title || '(blank)', merchant_name: name, reason: 'Validation failed' });
        continue;
      }

      // Look up the merchant; if it doesn't exist, auto-create with cj_advertiser_id
      // (when carried by the row, e.g. cj-raw imports). If it does exist but isn't
      // CJ-linked, opportunistically link it from the row's ADV_CID.
      let merchant = merchantByName.get(name.toLowerCase()) ?? null;
      if (!merchant) {
        try {
          const ins = await dbRun(
            'INSERT INTO merchants (name, cj_advertiser_id) VALUES (?, ?)',
            [name, cjAdvId]
          );
          const newId = (ins as { lastID: number }).lastID;
          merchant = { id: newId, name, cj_advertiser_id: cjAdvId, cj_max_commission_rate: null, cj_max_fixed_usd: null };
          merchantByName.set(name.toLowerCase(), merchant);
          createdMerchants.push(name);
        } catch (err) {
          results.push({ row: row.csvRow, status: 'error', title: row.title, merchant_name: name, reason: 'Failed to create merchant' });
          continue;
        }
      } else if (cjAdvId && !merchant.cj_advertiser_id) {
        await dbRun('UPDATE merchants SET cj_advertiser_id = ? WHERE id = ?', [cjAdvId, merchant.id]);
        merchant.cj_advertiser_id = cjAdvId;
      }

      const { cashback_rate, cashback_fixed_usd, source } = deriveOfferRate(format, row, merchant);
      if (format === 'native' && source === 'none') {
        results.push({ row: row.csvRow, status: 'error', title: row.title, merchant_name: name, reason: 'Invalid cashback_rate' });
        continue;
      }

      if (existingLinks.has(row.affiliate_link)) {
        results.push({ row: row.csvRow, status: 'skipped', title: row.title, merchant_name: name, reason: 'Duplicate affiliate link' });
        continue;
      }

      try {
        await dbRun(
          'INSERT INTO offers (merchant_id, title, description, cashback_rate, cashback_fixed_usd, terms, affiliate_link, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [merchant.id, row.title, row.description || null, cashback_rate, cashback_fixed_usd, row.terms || null, row.affiliate_link]
        );
        existingLinks.add(row.affiliate_link);
        results.push({ row: row.csvRow, status: 'imported', title: row.title, merchant_name: name });
      } catch (err) {
        results.push({ row: row.csvRow, status: 'error', title: row.title, merchant_name: name, reason: 'Database error' });
      }
    }

    const summary = {
      imported: results.filter((r) => r.status === 'imported').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      merchants_created: createdMerchants.length,
    };

    res.json({ results, summary, created_merchants: createdMerchants });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all offers (admin view)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    // Cap raised to 2000 so the admin Offers page can group offers by merchant
    // in a single fetch (current scale: ~50 merchants × ~1–10 offers each).
    // Revisit if the catalog grows past that.
    const limitNum = Math.min(2000, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const totalResult = await dbGet(`
      SELECT COUNT(*) as total
      FROM offers o
    `) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    const offers = await dbAll(`
      SELECT
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.cj_advertiser_id as merchant_cj_advertiser_id,
        m.cj_max_commission_rate as merchant_cj_max_commission_rate,
        m.cj_max_fixed_usd as merchant_cj_max_fixed_usd
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [limitNum, offset]);
    
    res.json({
      data: offers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get offer by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const offer = await dbGet(`
      SELECT o.*, m.name as merchant_name
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ?
    `, [req.params.id]);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    res.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create offer
router.post('/', authenticateAdmin, validateOffer, async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { merchant_id, title, description, cashback_rate, cashback_fixed_usd, terms, affiliate_link, is_active } = req.body;

    if (!merchant_id || !title || !affiliate_link) {
      return res.status(400).json({ error: 'Merchant ID, title, and affiliate link are required' });
    }
    // At least one of cashback_rate (> 0) or cashback_fixed_usd (> 0) must be set,
    // otherwise the offer is "free clicks" — let admins do that explicitly with 0/0
    // but warn so it's not silent.
    const rate = Number(cashback_rate) || 0;
    const fixed = cashback_fixed_usd == null ? null : Number(cashback_fixed_usd);
    if (rate === 0 && (fixed == null || fixed === 0)) {
      return res.status(400).json({
        error: 'Either cashback_rate or cashback_fixed_usd must be greater than 0',
      });
    }

    // Verify merchant exists
    const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const result = await dbRun(
      'INSERT INTO offers (merchant_id, title, description, cashback_rate, cashback_fixed_usd, terms, affiliate_link, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        merchant_id,
        title,
        description || null,
        rate,
        fixed,
        terms || null,
        affiliate_link,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    const offerId = (result as any).lastID;
    const offer = await dbGet(`
      SELECT o.*, m.name as merchant_name
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ?
    `, [offerId]) as any;

    // Send new offer alerts to users who opted in (async, don't wait)
    if (offer && offer.is_active === 1) {
      sendNewOfferAlerts(
        offerId,
        title,
        offer.merchant_name || 'Merchant',
        cashback_rate
      ).catch(err => {
        console.error('Error sending new offer alerts:', err);
      });
    }

    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update offer
router.put('/:id', authenticateAdmin, validateId, validateOffer, async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { merchant_id, title, description, cashback_rate, cashback_fixed_usd, terms, affiliate_link, is_active } = req.body;

    const offer = await dbGet('SELECT * FROM offers WHERE id = ?', [req.params.id]);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (merchant_id) {
      const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
    }

    // Pass `cashback_fixed_usd: null` explicitly to clear the flat amount;
    // omit it from the request body to leave it unchanged.
    const newFixed =
      cashback_fixed_usd === undefined ? (offer as any).cashback_fixed_usd
      : cashback_fixed_usd === null    ? null
      : Number(cashback_fixed_usd);

    await dbRun(
      'UPDATE offers SET merchant_id = ?, title = ?, description = ?, cashback_rate = ?, cashback_fixed_usd = ?, terms = ?, affiliate_link = ?, is_active = ? WHERE id = ?',
      [
        merchant_id !== undefined ? merchant_id : (offer as any).merchant_id,
        title !== undefined ? title : (offer as any).title,
        description !== undefined ? description : (offer as any).description,
        cashback_rate !== undefined ? cashback_rate : (offer as any).cashback_rate,
        newFixed,
        terms !== undefined ? terms : (offer as any).terms,
        affiliate_link !== undefined ? affiliate_link : (offer as any).affiliate_link,
        is_active !== undefined ? (is_active ? 1 : 0) : (offer as any).is_active,
        req.params.id
      ]
    );

    const updated = await dbGet(`
      SELECT o.*, m.name as merchant_name
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ?
    `, [req.params.id]);
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete offer
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const offer = await dbGet('SELECT * FROM offers WHERE id = ?', [req.params.id]);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    await dbRun('DELETE FROM offers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
