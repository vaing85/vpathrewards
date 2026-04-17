import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbAll, dbGet, dbRun } from '../../database';
import { sendEmailToUser } from '../../utils/emailService';
import { confirmReferralEarning } from '../referrals';

const router = express.Router();

// Get all cashback transactions
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, userId } = req.query;
    
    let query = `
      SELECT 
        ct.*,
        u.name as user_name,
        u.email as user_email,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        m.logo_url as merchant_logo
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` AND ct.status = ?`;
      params.push(status);
    }
    
    if (userId) {
      query += ` AND ct.user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY ct.transaction_date DESC`;
    
    const transactions = await dbAll(query, params);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching cashback transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cashback transaction by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const transaction = await dbGet(`
      SELECT 
        ct.*,
        u.name as user_name,
        u.email as user_email,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        m.logo_url as merchant_logo
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.id = ?
    `, [req.params.id]);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Cashback transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching cashback transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm cashback transaction
router.put('/:id/confirm', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const transaction = await dbGet(`
      SELECT 
        ct.*,
        u.name as user_name,
        u.email as user_email,
        o.title as offer_title,
        m.name as merchant_name
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.id = ?
    `, [req.params.id]) as any;
    
    if (!transaction) {
      return res.status(404).json({ error: 'Cashback transaction not found' });
    }
    
    if (transaction.status === 'confirmed') {
      return res.status(400).json({ error: 'Transaction is already confirmed' });
    }
    
    // Update transaction status
    await dbRun(
      'UPDATE cashback_transactions SET status = ? WHERE id = ?',
      ['confirmed', req.params.id]
    );
    
    // Confirm referral earnings for this transaction (async)
    confirmReferralEarning(parseInt(req.params.id)).catch(err => {
      console.error('Error confirming referral earning:', err);
    });
    
    // Send confirmation email (async, don't wait)
    sendEmailToUser(
      transaction.user_id,
      transaction.user_email,
      'cashbackConfirmation',
      {
        name: transaction.user_name,
        amount: transaction.amount,
        merchantName: transaction.merchant_name,
        offerTitle: transaction.offer_title
      },
      'cashback'
    ).catch(err => {
      console.error('Failed to send cashback confirmation email:', err);
    });
    
    const updated = await dbGet(`
      SELECT 
        ct.*,
        u.name as user_name,
        u.email as user_email,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        m.logo_url as merchant_logo
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.id = ?
    `, [req.params.id]);
    
    res.json(updated);
  } catch (error) {
    console.error('Error confirming cashback transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject cashback transaction
router.put('/:id/reject', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { reason } = req.body;
    const transaction = await dbGet('SELECT * FROM cashback_transactions WHERE id = ?', [req.params.id]) as any;
    
    if (!transaction) {
      return res.status(404).json({ error: 'Cashback transaction not found' });
    }
    
    if (transaction.status === 'rejected') {
      return res.status(400).json({ error: 'Transaction is already rejected' });
    }
    
    // If it was confirmed, we need to deduct from user's earnings
    if (transaction.status === 'confirmed') {
      await dbRun(
        'UPDATE users SET total_earnings = total_earnings - ? WHERE id = ?',
        [transaction.amount, transaction.user_id]
      );
    }
    
    // Update transaction status
    await dbRun(
      'UPDATE cashback_transactions SET status = ? WHERE id = ?',
      ['rejected', req.params.id]
    );
    
    const updated = await dbGet(`
      SELECT 
        ct.*,
        u.name as user_name,
        u.email as user_email,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        m.logo_url as merchant_logo
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.id = ?
    `, [req.params.id]);
    
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting cashback transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
