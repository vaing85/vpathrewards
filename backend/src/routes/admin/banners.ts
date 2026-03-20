import express from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth';
import { dbAll, dbGet, dbRun } from '../../database';

const router = express.Router();

// All routes require admin auth
const adminOnly = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  authenticateToken(req, res, async () => {
    const user = await dbGet('SELECT is_admin FROM users WHERE id = ?', [req.userId]) as any;
    if (!user?.is_admin) return res.status(403).json({ error: 'Forbidden' });
    next();
  });
};

// GET /api/admin/banners?merchant_id=X  — list all banners for a merchant
router.get('/', adminOnly, async (req: AuthRequest, res: express.Response) => {
  try {
    const { merchant_id } = req.query;
    if (!merchant_id) return res.status(400).json({ error: 'merchant_id is required' });
    const banners = await dbAll(
      'SELECT * FROM merchant_banners WHERE merchant_id = ? ORDER BY created_at DESC',
      [merchant_id]
    );
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/banners  — create a banner
router.post('/', adminOnly, async (req: AuthRequest, res: express.Response) => {
  try {
    const { merchant_id, image_url, click_url, width, height, alt_text } = req.body;
    if (!merchant_id || !image_url || !click_url || !width || !height) {
      return res.status(400).json({ error: 'merchant_id, image_url, click_url, width, height are required' });
    }
    const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const result = await dbRun(
      'INSERT INTO merchant_banners (merchant_id, image_url, click_url, width, height, alt_text, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [merchant_id, image_url, click_url, Number(width), Number(height), alt_text || null]
    );
    const banner = await dbGet('SELECT * FROM merchant_banners WHERE id = ?', [(result as any).lastID]);
    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/banners/:id  — toggle active or update fields
router.patch('/:id', adminOnly, async (req: AuthRequest, res: express.Response) => {
  try {
    const { is_active, image_url, click_url, alt_text } = req.body;
    const updates: string[] = [];
    const values: any[] = [];

    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (image_url !== undefined)  { updates.push('image_url = ?'); values.push(image_url); }
    if (click_url !== undefined)  { updates.push('click_url = ?'); values.push(click_url); }
    if (alt_text  !== undefined)  { updates.push('alt_text = ?');  values.push(alt_text); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id);

    await dbRun(`UPDATE merchant_banners SET ${updates.join(', ')} WHERE id = ?`, values);
    const banner = await dbGet('SELECT * FROM merchant_banners WHERE id = ?', [req.params.id]);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    res.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/banners/:id  — remove a banner permanently
router.delete('/:id', adminOnly, async (req: AuthRequest, res: express.Response) => {
  try {
    const result = await dbRun('DELETE FROM merchant_banners WHERE id = ?', [req.params.id]);
    if ((result as any).changes === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
