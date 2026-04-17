import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { validateOffer, validateId } from '../../middleware/validation';
import { sendNewOfferAlerts } from '../../utils/emailService';

const router = express.Router();

// ─── Bulk CSV Import ──────────────────────────────────────────────────────────

interface ImportRow {
  row: number;
  merchant_name: string;
  title: string;
  cashback_rate: string;
  affiliate_link: string;
  description?: string;
  terms?: string;
}

interface ImportResult {
  row: number;
  status: 'imported' | 'skipped' | 'error';
  title: string;
  merchant_name: string;
  reason?: string;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: ImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });

    rows.push({
      row: i,
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

// POST /api/admin/offers/preview — validate CSV rows (no DB writes)
router.post('/preview', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { csv } = req.body as { csv: string };
    if (!csv) return res.status(400).json({ error: 'csv field is required' });

    const rows = parseCSV(csv);
    if (rows.length === 0) return res.status(400).json({ error: 'No data rows found. Check your CSV format.' });

    const merchants = await dbAll<{ id: number; name: string }>('SELECT id, name FROM merchants');
    const merchantMap = new Map(merchants.map((m) => [m.name.toLowerCase(), m.id]));

    const existingLinks = new Set(
      (await dbAll<{ affiliate_link: string }>('SELECT affiliate_link FROM offers')).map((o) => o.affiliate_link)
    );

    const preview = rows.map((row) => {
      const errors: string[] = [];
      if (!row.merchant_name) errors.push('merchant_name missing');
      else if (!merchantMap.has(row.merchant_name.toLowerCase())) errors.push(`merchant "${row.merchant_name}" not found`);
      if (!row.title) errors.push('title missing');
      if (!row.cashback_rate || isNaN(parseFloat(row.cashback_rate))) errors.push('invalid cashback_rate');
      if (!row.affiliate_link) errors.push('affiliate_link missing');

      const duplicate = row.affiliate_link && existingLinks.has(row.affiliate_link);

      return {
        row: row.row,
        merchant_name: row.merchant_name,
        title: row.title,
        cashback_rate: row.cashback_rate,
        affiliate_link: row.affiliate_link,
        description: row.description,
        terms: row.terms,
        status: errors.length > 0 ? 'error' : duplicate ? 'duplicate' : 'ready',
        errors,
      };
    });

    res.json({ preview, total: preview.length });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/offers/import — bulk insert validated rows
router.post('/import', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { rows, skip_duplicates = true } = req.body as {
      rows: ImportRow[];
      skip_duplicates?: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: 'rows array is required' });

    const merchants = await dbAll<{ id: number; name: string }>('SELECT id, name FROM merchants');
    const merchantMap = new Map(merchants.map((m) => [m.name.toLowerCase(), m.id]));

    const existingLinks = new Set(
      (await dbAll<{ affiliate_link: string }>('SELECT affiliate_link FROM offers')).map((o) => o.affiliate_link)
    );

    const results: ImportResult[] = [];

    for (const row of rows) {
      const merchantId = merchantMap.get(row.merchant_name?.toLowerCase());

      if (!merchantId || !row.title || !row.affiliate_link || isNaN(parseFloat(row.cashback_rate))) {
        results.push({ row: row.row, status: 'error', title: row.title || '(blank)', merchant_name: row.merchant_name, reason: 'Validation failed' });
        continue;
      }

      if (existingLinks.has(row.affiliate_link)) {
        results.push({ row: row.row, status: 'skipped', title: row.title, merchant_name: row.merchant_name, reason: 'Duplicate affiliate link' });
        continue;
      }

      try {
        await dbRun(
          'INSERT INTO offers (merchant_id, title, description, cashback_rate, terms, affiliate_link, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [merchantId, row.title, row.description || null, parseFloat(row.cashback_rate), row.terms || null, row.affiliate_link]
        );
        existingLinks.add(row.affiliate_link);
        results.push({ row: row.row, status: 'imported', title: row.title, merchant_name: row.merchant_name });
      } catch (err) {
        results.push({ row: row.row, status: 'error', title: row.title, merchant_name: row.merchant_name, reason: 'Database error' });
      }
    }

    const summary = {
      imported: results.filter((r) => r.status === 'imported').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    };

    res.json({ results, summary });
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
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
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
        m.logo_url as merchant_logo
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
    const { merchant_id, title, description, cashback_rate, terms, affiliate_link, is_active } = req.body;

    if (!merchant_id || !title || !cashback_rate || !affiliate_link) {
      return res.status(400).json({ error: 'Merchant ID, title, cashback rate, and affiliate link are required' });
    }

    // Verify merchant exists
    const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const result = await dbRun(
      'INSERT INTO offers (merchant_id, title, description, cashback_rate, terms, affiliate_link, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        merchant_id,
        title,
        description || null,
        cashback_rate,
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
    const { merchant_id, title, description, cashback_rate, terms, affiliate_link, is_active } = req.body;

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

    await dbRun(
      'UPDATE offers SET merchant_id = ?, title = ?, description = ?, cashback_rate = ?, terms = ?, affiliate_link = ?, is_active = ? WHERE id = ?',
      [
        merchant_id !== undefined ? merchant_id : (offer as any).merchant_id,
        title !== undefined ? title : (offer as any).title,
        description !== undefined ? description : (offer as any).description,
        cashback_rate !== undefined ? cashback_rate : (offer as any).cashback_rate,
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
