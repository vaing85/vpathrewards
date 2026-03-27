import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { validateMerchant, validateId } from '../../middleware/validation';

const router = express.Router();

// Get all merchants (admin view)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const totalResult = await dbGet(`
      SELECT COUNT(DISTINCT m.id) as total
      FROM merchants m
    `) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    const merchants = await dbAll(`
      SELECT
        m.*,
        COALESCE(offer_stats.offer_count, 0) as offer_count
      FROM merchants m
      LEFT JOIN (
        SELECT merchant_id, COUNT(*) as offer_count
        FROM offers
        GROUP BY merchant_id
      ) offer_stats ON m.id = offer_stats.merchant_id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [limitNum, offset]);
    
    res.json({
      data: merchants,
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
router.post('/', authenticateAdmin, validateMerchant, async (req: express.Request, res: express.Response) => {
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
router.put('/:id', authenticateAdmin, validateId, validateMerchant, async (req: express.Request, res: express.Response) => {
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
