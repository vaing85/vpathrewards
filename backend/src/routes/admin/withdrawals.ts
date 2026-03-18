import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { sendEmailToUser } from '../../utils/emailService';

const router = express.Router();

// Get all withdrawals
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        w.*,
        u.name as user_name,
        u.email as user_email,
        admin.name as processed_by_name
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN users admin ON w.processed_by = admin.id
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE w.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY w.requested_at DESC`;
    
    const withdrawals = await dbAll(query, params);
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get withdrawal by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const withdrawal = await dbGet(`
      SELECT 
        w.*,
        u.name as user_name,
        u.email as user_email,
        admin.name as processed_by_name
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN users admin ON w.processed_by = admin.id
      WHERE w.id = ?
    `, [req.params.id]);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    res.json(withdrawal);
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update withdrawal status (approve/reject)
router.put('/:id/status', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { status, admin_notes } = req.body;

    if (!status || !['pending', 'approved', 'processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const withdrawal = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [req.params.id]) as any;
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // If approving, check user has enough balance
    if (status === 'approved' && withdrawal.status === 'pending') {
      const user = await dbGet('SELECT total_earnings FROM users WHERE id = ?', [withdrawal.user_id]) as any;
      const pendingWithdrawals = await dbGet(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM withdrawals
        WHERE user_id = ? AND status IN ('pending', 'approved', 'processing')
      `, [withdrawal.user_id]) as any;
      
      const availableBalance = (user?.total_earnings || 0) - (pendingWithdrawals?.total || 0) + withdrawal.amount;
      
      if (withdrawal.amount > availableBalance) {
        return res.status(400).json({ error: 'User has insufficient balance' });
      }
    }

    // If completing, deduct from user's total earnings
    if (status === 'completed' && withdrawal.status !== 'completed') {
      await dbRun(
        'UPDATE users SET total_earnings = total_earnings - ? WHERE id = ?',
        [withdrawal.amount, withdrawal.user_id]
      );
    }

    // If rejecting a pending withdrawal, nothing to deduct
    // If rejecting an approved/processing withdrawal, we need to add back (but this shouldn't happen normally)

    const processedAt = status === 'completed' || status === 'rejected' ? new Date().toISOString() : null;

    await dbRun(
      'UPDATE withdrawals SET status = ?, admin_notes = ?, processed_by = ?, processed_at = ? WHERE id = ?',
      [
        status,
        admin_notes || null,
        req.userId,
        processedAt,
        req.params.id
      ]
    );

    const updated = await dbGet(`
      SELECT 
        w.*,
        u.name as user_name,
        u.email as user_email,
        admin.name as processed_by_name
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      LEFT JOIN users admin ON w.processed_by = admin.id
      WHERE w.id = ?
    `, [req.params.id]) as any;

    // Send withdrawal status email (async, don't wait)
    if (updated && updated.user_email && updated.status !== 'pending') {
      sendEmailToUser(
        updated.user_id,
        updated.user_email,
        'withdrawalStatus',
        {
          name: updated.user_name,
          amount: updated.amount,
          status: updated.status,
          adminNotes: admin_notes
        },
        'withdrawal'
      ).catch(err => {
        console.error('Failed to send withdrawal notification email:', err);
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get withdrawal statistics
router.get('/stats/summary', authenticateAdmin, async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status = 'processing' THEN amount ELSE 0 END) as processing_total,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_total,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM withdrawals
    `) as any;

    res.json(stats);
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
