import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { validateOffer, validateId } from '../../middleware/validation';
import { sendNewOfferAlerts } from '../../utils/emailService';

const router = express.Router();

// Get all offers (admin view)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Get total, active, and inactive counts
    const totalResult = await dbGet(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_active != 1 THEN 1 ELSE 0 END) as inactive
      FROM offers
    `) as { total: number; active: number; inactive: number };
    const total = totalResult?.total || 0;
    const totalActive = totalResult?.active || 0;
    const totalInactive = totalResult?.inactive || 0;
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
        totalActive,
        totalInactive,
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
router.post('/', authenticateAdmin, validateOffer, async (req: express.Request, res: express.Response) => {
  try {
    const { merchant_id, title, description, cashback_rate, cashback_type, commission_rate, terms, affiliate_link, is_active, end_date, excluded_states } = req.body;

    if (!merchant_id || !title || !cashback_rate || !affiliate_link) {
      return res.status(400).json({ error: 'Merchant ID, title, cashback rate, and affiliate link are required' });
    }

    // Verify merchant exists
    const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const result = await dbRun(
      'INSERT INTO offers (merchant_id, title, description, cashback_rate, cashback_type, commission_rate, terms, affiliate_link, is_active, end_date, excluded_states) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        merchant_id,
        title,
        description || null,
        cashback_rate,
        cashback_type || 'percentage',
        commission_rate || 0,
        terms || null,
        affiliate_link,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        end_date || null,
        excluded_states || null
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
router.put('/:id', authenticateAdmin, validateId, validateOffer, async (req: express.Request, res: express.Response) => {
  try {
    const { merchant_id, title, description, cashback_rate, cashback_type, commission_rate, terms, affiliate_link, is_active, end_date, excluded_states } = req.body;

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
      'UPDATE offers SET merchant_id = ?, title = ?, description = ?, cashback_rate = ?, cashback_type = ?, commission_rate = ?, terms = ?, affiliate_link = ?, is_active = ?, end_date = ?, excluded_states = ? WHERE id = ?',
      [
        merchant_id !== undefined ? merchant_id : (offer as any).merchant_id,
        title !== undefined ? title : (offer as any).title,
        description !== undefined ? description : (offer as any).description,
        cashback_rate !== undefined ? cashback_rate : (offer as any).cashback_rate,
        cashback_type !== undefined ? cashback_type : (offer as any).cashback_type || 'percentage',
        commission_rate !== undefined ? commission_rate : (offer as any).commission_rate,
        terms !== undefined ? terms : (offer as any).terms,
        affiliate_link !== undefined ? affiliate_link : (offer as any).affiliate_link,
        is_active !== undefined ? (is_active ? 1 : 0) : (offer as any).is_active,
        end_date !== undefined ? end_date || null : (offer as any).end_date,
        excluded_states !== undefined ? excluded_states || null : (offer as any).excluded_states,
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
// Bulk import offers from CSV
router.post('/bulk', authenticateAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { offers } = req.body;
    if (!Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({ error: 'No offers provided' });
    }

    let imported = 0;
    let skipped = 0;

    for (const offer of offers) {
      const { merchant_id, title, description, affiliate_link, cashback_rate, commission_rate, cashback_type, category } = offer;
      if (!merchant_id || !title || !affiliate_link || cashback_rate === undefined) {
        skipped++;
        continue;
      }
      // Skip duplicates
      const exists = await dbGet(
        'SELECT id FROM offers WHERE merchant_id = ? AND title = ?',
        [merchant_id, title]
      );
      if (exists) { skipped++; continue; }

      await dbRun(
        'INSERT INTO offers (merchant_id, title, description, affiliate_link, cashback_rate, commission_rate, cashback_type, category, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [merchant_id, title, description || '', affiliate_link, cashback_rate, commission_rate || 0, cashback_type || 'percentage', category || null]
      );
      imported++;
    }

    res.json({ imported, skipped });
  } catch (error) {
    console.error('Error bulk importing offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all broken/expired offers detected by link checker
router.get('/link-status/broken', authenticateAdmin, async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const offers = await dbAll(`
      SELECT o.id, o.title, o.affiliate_link, o.link_status, o.link_last_checked, o.link_error, o.is_active,
             m.name as merchant_name
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.link_status IN ('broken', 'expired')
      ORDER BY o.link_last_checked DESC
    `, []);
    res.json({ data: offers });
  } catch (error) {
    console.error('Error fetching broken offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete all broken/expired offers
router.delete('/broken', authenticateAdmin, async (_req, res) => {
  try {
    const broken = await dbAll(
      `SELECT id FROM offers WHERE link_status IN ('broken', 'expired')`,
      []
    ) as Array<{ id: number }>;

    if (broken.length === 0) {
      return res.json({ deleted: 0 });
    }

    const ids = broken.map(o => o.id);
    const placeholders = ids.map(() => '?').join(',');

    await dbRun(`DELETE FROM user_favorites WHERE offer_id IN (${placeholders})`, ids);
    await dbRun(`DELETE FROM affiliate_clicks WHERE offer_id IN (${placeholders})`, ids);
    await dbRun(`DELETE FROM conversions WHERE offer_id IN (${placeholders})`, ids);
    await dbRun(`DELETE FROM cashback_transactions WHERE offer_id IN (${placeholders})`, ids);
    await dbRun(`DELETE FROM offers WHERE id IN (${placeholders})`, ids);

    res.json({ deleted: ids.length });
  } catch (error) {
    console.error('Error deleting broken offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const offer = await dbGet('SELECT * FROM offers WHERE id = ?', [req.params.id]);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Remove related records before deleting the offer to avoid FK constraint errors
    await dbRun('DELETE FROM user_favorites WHERE offer_id = ?', [req.params.id]);
    await dbRun('DELETE FROM affiliate_clicks WHERE offer_id = ?', [req.params.id]);
    await dbRun('DELETE FROM conversions WHERE offer_id = ?', [req.params.id]);
    await dbRun('DELETE FROM cashback_transactions WHERE offer_id = ?', [req.params.id]);
    await dbRun('DELETE FROM offers WHERE id = ?', [req.params.id]);

    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
