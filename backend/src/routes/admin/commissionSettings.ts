import express from 'express';
import { authenticateAdmin } from '../../middleware/adminAuth';
import { dbGet, dbRun } from '../../database';

const router = express.Router();

// GET /admin/commission — fetch current platform commission settings
router.get('/', authenticateAdmin, async (_req, res) => {
  try {
    const settings = await dbGet('SELECT * FROM platform_settings WHERE id = 1');
    res.json(settings || { commission_type: 'percentage', platform_share: 25.0, flat_amount: 0.0 });
  } catch (error) {
    console.error('Error fetching commission settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /admin/commission — update platform commission settings
router.put('/', authenticateAdmin, async (req, res) => {
  try {
    const { commission_type, platform_share, flat_amount } = req.body;

    if (!['percentage', 'flat'].includes(commission_type)) {
      return res.status(400).json({ error: 'commission_type must be "percentage" or "flat"' });
    }

    if (commission_type === 'percentage') {
      const pct = parseFloat(platform_share);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({ error: 'platform_share must be between 0 and 100' });
      }
    }

    if (commission_type === 'flat') {
      const flat = parseFloat(flat_amount);
      if (isNaN(flat) || flat < 0) {
        return res.status(400).json({ error: 'flat_amount must be a non-negative number' });
      }
    }

    await dbRun(
      `UPDATE platform_settings
       SET commission_type = ?, platform_share = ?, flat_amount = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [commission_type, parseFloat(platform_share) || 25.0, parseFloat(flat_amount) || 0.0]
    );

    const updated = await dbGet('SELECT * FROM platform_settings WHERE id = 1');
    res.json(updated);
  } catch (error) {
    console.error('Error updating commission settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
