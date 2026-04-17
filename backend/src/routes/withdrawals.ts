import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';
import { sendEmailToUser } from '../utils/emailService';
import { validateWithdrawal } from '../middleware/validation';
import { passwordLimiter } from '../middleware/rateLimiter';

const router = express.Router();

const MIN_WITHDRAWAL_AMOUNT = 10.0; // Minimum $10 to withdraw

// Get user's withdrawal history
router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const withdrawals = await dbAll(`
      SELECT 
        w.*,
        u.name as processed_by_name
      FROM withdrawals w
      LEFT JOIN users u ON w.processed_by = u.id
      WHERE w.user_id = ?
      ORDER BY w.requested_at DESC
    `, [req.userId]);
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get withdrawal by ID (user's own withdrawals only)
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const withdrawal = await dbGet(`
      SELECT 
        w.*,
        u.name as processed_by_name
      FROM withdrawals w
      LEFT JOIN users u ON w.processed_by = u.id
      WHERE w.id = ? AND w.user_id = ?
    `, [req.params.id, req.userId]);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    res.json(withdrawal);
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's available balance for withdrawal
router.get('/balance/available', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet('SELECT total_earnings FROM users WHERE id = ?', [req.userId]) as any;
    
    // Get total pending withdrawals
    const pendingWithdrawals = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM withdrawals
      WHERE user_id = ? AND status = 'pending'
    `, [req.userId]) as any;
    
    const availableBalance = (user?.total_earnings || 0) - (pendingWithdrawals?.total || 0);
    
    res.json({
      total_earnings: user?.total_earnings || 0,
      pending_withdrawals: pendingWithdrawals?.total || 0,
      available_balance: Math.max(0, availableBalance),
      min_withdrawal: MIN_WITHDRAWAL_AMOUNT,
      can_withdraw: availableBalance >= MIN_WITHDRAWAL_AMOUNT
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create withdrawal request
router.post('/request', authenticateToken, passwordLimiter, validateWithdrawal, async (req: AuthRequest, res: import('express').Response) => {
  try {
    const { amount, payment_method, payment_details } = req.body;

    // Validation
    if (!amount || !payment_method || !payment_details) {
      return res.status(400).json({ error: 'Amount, payment method, and payment details are required' });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({ 
        error: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}` 
      });
    }

    // Check available balance
    const user = await dbGet('SELECT total_earnings, name, email FROM users WHERE id = ?', [req.userId]) as any;
    const pendingWithdrawals = await dbGet(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM withdrawals
      WHERE user_id = ? AND status = 'pending'
    `, [req.userId]) as any;
    
    const availableBalance = (user?.total_earnings || 0) - (pendingWithdrawals?.total || 0);
    
    if (withdrawalAmount > availableBalance) {
      return res.status(400).json({ 
        error: 'Insufficient balance. You have pending withdrawals or insufficient earnings.' 
      });
    }

    // Create withdrawal request
    const result = await dbRun(
      'INSERT INTO withdrawals (user_id, amount, payment_method, payment_details, status) VALUES (?, ?, ?, ?, ?)',
      [req.userId, withdrawalAmount, payment_method, payment_details, 'pending']
    );

    const withdrawalId = (result as any).lastID;
    const withdrawal = await dbGet('SELECT * FROM withdrawals WHERE id = ?', [withdrawalId]);

    // Send withdrawal request confirmation email (async, don't wait)
    if (user && user.email) {
      sendEmailToUser(
        req.userId!,
        user.email,
        'withdrawalStatus',
        {
          name: user.name,
          amount: withdrawalAmount,
          status: 'pending'
        },
        'withdrawal'
      ).catch(err => {
        console.error('Failed to send withdrawal request email:', err);
      });
    }

    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
