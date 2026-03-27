import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { auditLog } from '../../middleware/auditLog';

const router = express.Router();

// Get all users
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const totalResult = await dbGet(`
      SELECT COUNT(*) as total
      FROM users
    `) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    const users = await dbAll(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.total_earnings,
        u.is_admin,
        u.created_at,
        (SELECT COUNT(*) FROM cashback_transactions WHERE user_id = u.id) as transaction_count,
        COALESCE(s.plan, 'free') as subscription_plan,
        COALESCE(s.status, 'active') as subscription_status
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [limitNum, offset]);
    
    res.json({
      data: users,
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await dbGet(`
      SELECT 
        id,
        email,
        name,
        total_earnings,
        is_admin,
        created_at
      FROM users 
      WHERE id = ?
    `, [req.params.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user transactions
router.get('/:id/transactions', authenticateAdmin, async (req, res) => {
  try {
    const transactions = await dbAll(`
      SELECT 
        ct.*,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name
      FROM cashback_transactions ct
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.user_id = ?
      ORDER BY ct.transaction_date DESC
    `, [req.params.id]);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin can update earnings, make admin, etc.)
router.put('/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { name, total_earnings, is_admin } = req.body;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun(
      'UPDATE users SET name = ?, total_earnings = ?, is_admin = ? WHERE id = ?',
      [
        name !== undefined ? name : (user as any).name,
        total_earnings !== undefined ? total_earnings : (user as any).total_earnings,
        is_admin !== undefined ? (is_admin ? 1 : 0) : (user as any).is_admin,
        req.params.id
      ]
    );

    auditLog({
      adminId: req.userId!,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: req.params.id,
      details: { name, total_earnings, is_admin },
      req,
    });

    const updated = await dbGet(`
      SELECT
        id,
        email,
        name,
        total_earnings,
        is_admin,
        created_at
      FROM users
      WHERE id = ?
    `, [req.params.id]);

    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user as any).is_admin) {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    const id = req.params.id;

    // Remove all FK-dependent rows in dependency order before deleting the user.
    // referral_earnings references cashback_transactions, so it goes first.
    await dbRun('DELETE FROM referral_earnings WHERE referrer_id = ? OR referred_id = ?', [id, id]);
    await dbRun('DELETE FROM cashback_transactions WHERE user_id = ?', [id]);
    // Nullable FKs: NULL out rather than delete so click/conversion history is preserved.
    await dbRun('UPDATE conversions SET user_id = NULL WHERE user_id = ?', [id]);
    await dbRun('UPDATE affiliate_clicks SET user_id = NULL WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM withdrawals WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM user_favorites WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM merchant_reviews WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM cashback_goals WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM subscriptions WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM referral_relationships WHERE referrer_id = ? OR referred_id = ?', [id, id]);
    await dbRun('DELETE FROM user_referral_codes WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    await dbRun('DELETE FROM users WHERE id = ?', [id]);

    auditLog({
      adminId: req.userId!,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: req.params.id,
      details: { email: (user as any).email },
      req,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
