import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { validateMerchant, validateId } from '../../middleware/validation';

const router = express.Router();

// ─── Bulk CSV Import ──────────────────────────────────────────────────────────
//
// Mirrors the offer importer (routes/admin/offers.ts): a /preview endpoint that
// validates rows without writing, then /import that inserts the valid ones.
// Unlike offers — which require an existing merchant — this creates new
// merchants. Rows may carry a cj_advertiser_id so the next CJ advertiser sync
// enriches them with commission terms automatically.

interface MerchantImportRow {
  row: number;
  name: string;
  category?: string;
  website_url?: string;
  logo_url?: string;
  cj_advertiser_id?: string;
  description?: string;
}

interface MerchantImportResult {
  row: number;
  status: 'imported' | 'skipped' | 'error';
  name: string;
  reason?: string;
}

function parseMerchantCSV(text: string): MerchantImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: MerchantImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
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
      name: obj['name'] || obj['merchant_name'] || obj['merchant'] || '',
      category: obj['category'] || undefined,
      website_url: obj['website_url'] || obj['website'] || obj['url'] || undefined,
      logo_url: obj['logo_url'] || obj['logo'] || undefined,
      cj_advertiser_id: obj['cj_advertiser_id'] || obj['advertiser_id'] || undefined,
      description: obj['description'] || undefined,
    });
  }
  return rows;
}

const looksLikeUrl = (v: string): boolean => /^https?:\/\/\S+$/i.test(v);

// POST /api/admin/merchants/preview — validate CSV rows (no DB writes)
router.post('/preview', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { csv } = req.body as { csv: string };
    if (!csv) return res.status(400).json({ error: 'csv field is required' });

    const rows = parseMerchantCSV(csv);
    if (rows.length === 0) return res.status(400).json({ error: 'No data rows found. Check your CSV format.' });

    const existingNames = new Set(
      (await dbAll<{ name: string }>('SELECT name FROM merchants')).map((m) => m.name.toLowerCase())
    );

    // Track names within this CSV so a name repeated in the file is flagged as
    // a duplicate on its second occurrence rather than imported twice.
    const seenInFile = new Set<string>();

    const preview = rows.map((row) => {
      const errors: string[] = [];
      const name = row.name?.trim() ?? '';
      const key = name.toLowerCase();

      if (!name) errors.push('name missing');
      else if (name.length < 2) errors.push('name too short (min 2 chars)');
      if (row.website_url && !looksLikeUrl(row.website_url)) errors.push('website_url must start with http(s)://');
      if (row.logo_url && !looksLikeUrl(row.logo_url)) errors.push('logo_url must start with http(s)://');
      if (row.cj_advertiser_id && !/^\d+$/.test(row.cj_advertiser_id.trim())) errors.push('cj_advertiser_id must be numeric');

      const duplicate = !!name && (existingNames.has(key) || seenInFile.has(key));
      if (key) seenInFile.add(key);

      return {
        row: row.row,
        name,
        category: row.category,
        website_url: row.website_url,
        logo_url: row.logo_url,
        cj_advertiser_id: row.cj_advertiser_id,
        description: row.description,
        status: errors.length > 0 ? 'error' : duplicate ? 'duplicate' : 'ready',
        errors,
      };
    });

    res.json({ preview, total: preview.length });
  } catch (err) {
    console.error('Merchant preview error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/merchants/import — bulk insert validated rows
router.post('/import', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { rows } = req.body as { rows: MerchantImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: 'rows array is required' });

    const existingNames = new Set(
      (await dbAll<{ name: string }>('SELECT name FROM merchants')).map((m) => m.name.toLowerCase())
    );

    const results: MerchantImportResult[] = [];

    for (const row of rows) {
      const name = row.name?.trim() ?? '';
      const key = name.toLowerCase();

      if (!name || name.length < 2) {
        results.push({ row: row.row, status: 'error', name: name || '(blank)', reason: 'Invalid name' });
        continue;
      }
      if (row.cj_advertiser_id && !/^\d+$/.test(row.cj_advertiser_id.trim())) {
        results.push({ row: row.row, status: 'error', name, reason: 'cj_advertiser_id not numeric' });
        continue;
      }
      if (existingNames.has(key)) {
        results.push({ row: row.row, status: 'skipped', name, reason: 'Merchant name already exists' });
        continue;
      }

      try {
        await dbRun(
          'INSERT INTO merchants (name, description, logo_url, website_url, category, cj_advertiser_id) VALUES (?, ?, ?, ?, ?, ?)',
          [
            name,
            row.description?.trim() || null,
            row.logo_url?.trim() || null,
            row.website_url?.trim() || null,
            row.category?.trim() || null,
            row.cj_advertiser_id?.trim() || null,
          ]
        );
        existingNames.add(key);
        results.push({ row: row.row, status: 'imported', name });
      } catch (err) {
        results.push({ row: row.row, status: 'error', name, reason: 'Database error' });
      }
    }

    const summary = {
      imported: results.filter((r) => r.status === 'imported').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    };

    res.json({ results, summary });
  } catch (err) {
    console.error('Merchant import error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all merchants (admin view)
//
// Query params:
//   page, limit  — standard pagination
//   search       — case-insensitive substring match on merchant name
//   category     — exact category match (or empty string for "uncategorised")
//
// Response includes per-merchant aggregates so AdminMerchants can show
// offers count, average cashback rate, and CJ-link status without N+1
// follow-up requests. Also returns the distinct categories list so the
// frontend can populate its filter dropdown.
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20', search = '', category = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    const searchTerm = (search as string).trim();
    const categoryTerm = (category as string).trim();

    // Build WHERE clauses + params consistently across both queries.
    // LOWER(...) LIKE LOWER(?) is portable between SQLite and Postgres
    // (ILIKE doesn't exist in SQLite).
    const whereParts: string[] = [];
    const whereParams: any[] = [];
    if (searchTerm) {
      whereParts.push('LOWER(m.name) LIKE LOWER(?)');
      whereParams.push(`%${searchTerm}%`);
    }
    if (categoryTerm) {
      whereParts.push('m.category = ?');
      whereParams.push(categoryTerm);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Get filtered total count
    const totalResult = await dbGet(
      `SELECT COUNT(DISTINCT m.id) as total FROM merchants m ${whereSql}`,
      whereParams
    ) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    const merchants = await dbAll(
      `SELECT
         m.*,
         COUNT(o.id) AS offer_count,
         COUNT(CASE WHEN o.is_active = 1 THEN 1 END) AS active_offer_count,
         AVG(CASE WHEN o.is_active = 1
                       AND (o.cashback_fixed_usd IS NULL OR o.cashback_fixed_usd = 0)
                  THEN o.cashback_rate END) AS avg_cashback_rate
       FROM merchants m
       LEFT JOIN offers o ON m.id = o.merchant_id
       ${whereSql}
       GROUP BY m.id
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, limitNum, offset]
    );

    // Distinct categories for the filter dropdown — unfiltered, since the
    // dropdown should always show every option regardless of the current
    // search. Empty/null categories are excluded.
    const categoriesRows = await dbAll(
      `SELECT DISTINCT category FROM merchants WHERE category IS NOT NULL AND category != '' ORDER BY category`
    ) as Array<{ category: string }>;

    res.json({
      data: merchants,
      categories: categoriesRows.map((r) => r.category),
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
    console.error('Error fetching merchants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get merchant by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const merchant = await dbGet('SELECT * FROM merchants WHERE id = ?', [req.params.id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    res.json(merchant);
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create merchant
router.post('/', authenticateAdmin, validateMerchant, async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { name, description, logo_url, website_url, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Merchant name is required' });
    }

    const result = await dbRun(
      'INSERT INTO merchants (name, description, logo_url, website_url, category) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, logo_url || null, website_url || null, category || null]
    );

    const merchantId = (result as any).lastID;
    const merchant = await dbGet('SELECT * FROM merchants WHERE id = ?', [merchantId]);

    res.status(201).json(merchant);
  } catch (error) {
    console.error('Error creating merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update merchant
router.put('/:id', authenticateAdmin, validateId, validateMerchant, async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { name, description, logo_url, website_url, category } = req.body;

    const merchant = await dbGet('SELECT * FROM merchants WHERE id = ?', [req.params.id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    await dbRun(
      'UPDATE merchants SET name = ?, description = ?, logo_url = ?, website_url = ?, category = ? WHERE id = ?',
      [
        name || (merchant as any).name,
        description !== undefined ? description : (merchant as any).description,
        logo_url !== undefined ? logo_url : (merchant as any).logo_url,
        website_url !== undefined ? website_url : (merchant as any).website_url,
        category !== undefined ? category : (merchant as any).category,
        req.params.id
      ]
    );

    const updated = await dbGet('SELECT * FROM merchants WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete merchant
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const merchant = await dbGet('SELECT * FROM merchants WHERE id = ?', [req.params.id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Check if merchant has offers
    const offers = await dbAll('SELECT id FROM offers WHERE merchant_id = ?', [req.params.id]);
    if (offers.length > 0) {
      return res.status(400).json({ error: 'Cannot delete merchant with active offers. Delete offers first.' });
    }

    await dbRun('DELETE FROM merchants WHERE id = ?', [req.params.id]);
    res.json({ message: 'Merchant deleted successfully' });
  } catch (error) {
    console.error('Error deleting merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
