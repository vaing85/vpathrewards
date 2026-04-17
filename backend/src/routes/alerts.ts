/**
 * Cashback / rate-increase alert routes
 * GET    /api/alerts          — list user's alerts
 * POST   /api/alerts          — create an alert
 * DELETE /api/alerts/:id      — remove an alert
 */
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const alerts = await dbAll(
      `SELECT a.*, m.name as merchant_name, o.title as offer_title, o.cashback_rate
       FROM cashback_alerts a
       LEFT JOIN merchants m ON a.merchant_id = m.id
       LEFT JOIN offers o ON a.offer_id = o.id
       WHERE a.user_id = ? AND a.is_active = 1
       ORDER BY a.created_at DESC`,
      [req.userId]
    );
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const { merchant_id, offer_id, threshold_rate, alert_type = 'rate_increase' } = req.body;

  if (!merchant_id && !offer_id) {
    return res.status(400).json({ error: 'merchant_id or offer_id is required' });
  }

  try {
    const result = await dbRun(
      `INSERT INTO cashback_alerts (user_id, merchant_id, offer_id, alert_type, threshold_rate)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, merchant_id || null, offer_id || null, alert_type, threshold_rate || null]
    );
    const alert = await dbGet('SELECT * FROM cashback_alerts WHERE id = ?', [result.lastID]);
    res.status(201).json({ alert });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await dbRun(
      'UPDATE cashback_alerts SET is_active = 0 WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
