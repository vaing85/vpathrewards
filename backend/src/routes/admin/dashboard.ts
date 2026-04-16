import express from 'express';
import { authenticateAdmin } from '../../middleware/adminAuth';
import { dbGet, dbAll } from '../../database';

const router = express.Router();

// Get dashboard overview (root endpoint - combines stats and recent transactions)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalMerchants,
      totalOffers,
      totalTransactions,
      totalEarnings,
      activeOffers,
      pendingTransactions,
      confirmedTransactions
    ] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM users WHERE is_admin = 0') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM merchants') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM offers') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions') as Promise<{ count: number }>,
      dbGet('SELECT SUM(total_earnings) as total FROM users') as Promise<{ total: number }>,
      dbGet('SELECT COUNT(*) as count FROM offers WHERE is_active = 1') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions WHERE status = ?', ['pending']) as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions WHERE status = ?', ['confirmed']) as Promise<{ count: number }>
    ]);

    const [
      totalCashbackPaid,
      totalCashbackPending,
      recentTransactions
    ] = await Promise.all([
      dbGet('SELECT SUM(amount) as total FROM cashback_transactions WHERE status = ?', ['confirmed']) as Promise<{ total: number }>,
      dbGet('SELECT SUM(amount) as total FROM cashback_transactions WHERE status = ?', ['pending']) as Promise<{ total: number }>,
      dbAll(`
        SELECT 
          ct.*,
          u.email as user_email,
          u.name as user_name,
          o.title as offer_title,
          o.cashback_rate,
          m.name as merchant_name
        FROM cashback_transactions ct
        JOIN users u ON ct.user_id = u.id
        JOIN offers o ON ct.offer_id = o.id
        JOIN merchants m ON o.merchant_id = m.id
        ORDER BY ct.transaction_date DESC
        LIMIT 10
      `)
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers.count
        },
        merchants: {
          total: totalMerchants.count
        },
        offers: {
          total: totalOffers.count,
          active: activeOffers.count
        },
        transactions: {
          total: totalTransactions.count,
          pending: pendingTransactions.count,
          confirmed: confirmedTransactions.count
        },
        earnings: {
          total_user_earnings: totalEarnings.total || 0,
          total_cashback_paid: totalCashbackPaid.total || 0,
          total_cashback_pending: totalCashbackPending.total || 0
        }
      },
      recent_transactions: recentTransactions || []
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalMerchants,
      totalOffers,
      totalTransactions,
      totalEarnings,
      activeOffers,
      pendingTransactions,
      confirmedTransactions
    ] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM users WHERE is_admin = 0') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM merchants') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM offers') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions') as Promise<{ count: number }>,
      dbGet('SELECT SUM(total_earnings) as total FROM users') as Promise<{ total: number }>,
      dbGet('SELECT COUNT(*) as count FROM offers WHERE is_active = 1') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions WHERE status = ?', ['pending']) as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM cashback_transactions WHERE status = ?', ['confirmed']) as Promise<{ count: number }>
    ]);

    const [
      totalCashbackPaid,
      totalCashbackPending
    ] = await Promise.all([
      dbGet('SELECT SUM(amount) as total FROM cashback_transactions WHERE status = ?', ['confirmed']) as Promise<{ total: number }>,
      dbGet('SELECT SUM(amount) as total FROM cashback_transactions WHERE status = ?', ['pending']) as Promise<{ total: number }>
    ]);

    res.json({
      users: {
        total: totalUsers.count
      },
      merchants: {
        total: totalMerchants.count
      },
      offers: {
        total: totalOffers.count,
        active: activeOffers.count
      },
      transactions: {
        total: totalTransactions.count,
        pending: pendingTransactions.count,
        confirmed: confirmedTransactions.count
      },
      earnings: {
        total_user_earnings: totalEarnings.total || 0,
        total_cashback_paid: totalCashbackPaid.total || 0,
        total_cashback_pending: totalCashbackPending.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent transactions
router.get('/recent-transactions', authenticateAdmin, async (req, res) => {
  try {
    const transactions = await dbAll(`
      SELECT 
        ct.*,
        u.email as user_email,
        u.name as user_name,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name
      FROM cashback_transactions ct
      JOIN users u ON ct.user_id = u.id
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      ORDER BY ct.transaction_date DESC
      LIMIT 10
    `);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
