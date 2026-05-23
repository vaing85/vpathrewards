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

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/dashboard/overview
//
// Action-oriented snapshot for the redesigned admin dashboard. Surfaces the
// queue of things needing human action (pending withdrawals, unconfirmed
// cashback), platform metrics (this month vs last month), growth indicators,
// and a unified recent activity feed.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', authenticateAdmin, async (_req, res) => {
  try {
    // Compute date boundaries in JS so the SQL stays portable (PG + SQLite).
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfThisWeek = new Date(now.getTime() - now.getDay() * dayMs).toISOString();
    const startOfLastWeek = new Date(now.getTime() - (now.getDay() + 7) * dayMs).toISOString();

    const [
      pendingWithdrawals,
      pendingTransactions,
      thisMonthCommission,
      lastMonthCommission,
      thisMonthCashback,
      lastMonthCashback,
      thisMonthPaidOut,
      lastMonthPaidOut,
      newUsersThisWeek,
      newUsersLastWeek,
      activeMerchants,
      activeOffers,
      recentActivity,
    ] = await Promise.all([
      dbGet(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
         FROM withdrawals WHERE status = ?`,
        ['pending']
      ) as Promise<{ count: number; total: number }>,

      dbGet(
        `SELECT COUNT(*) as count FROM cashback_transactions WHERE status = ?`,
        ['pending']
      ) as Promise<{ count: number }>,

      // Platform's total keep, split into fee revenue (the flat $5 service
      // charge per conversion above the waiver threshold) and the coffer
      // (variable margin). platform_amount already includes the fee, so the
      // coffer = platform_amount - platform_fee_amount.
      dbGet(
        `SELECT COALESCE(SUM(platform_amount), 0) as total,
                COALESCE(SUM(platform_fee_amount), 0) as fee,
                COALESCE(SUM(platform_amount - platform_fee_amount), 0) as coffer
         FROM cashback_transactions
         WHERE status = ? AND transaction_date >= ?`,
        ['confirmed', startOfThisMonth]
      ) as Promise<{ total: number; fee: number; coffer: number }>,

      dbGet(
        `SELECT COALESCE(SUM(platform_amount), 0) as total,
                COALESCE(SUM(platform_fee_amount), 0) as fee,
                COALESCE(SUM(platform_amount - platform_fee_amount), 0) as coffer
         FROM cashback_transactions
         WHERE status = ? AND transaction_date >= ? AND transaction_date < ?`,
        ['confirmed', startOfLastMonth, startOfThisMonth]
      ) as Promise<{ total: number; fee: number; coffer: number }>,

      // Cashback owed to users (confirmed user_amount) for this/last month.
      dbGet(
        `SELECT COALESCE(SUM(user_amount), 0) as total
         FROM cashback_transactions
         WHERE status = ? AND transaction_date >= ?`,
        ['confirmed', startOfThisMonth]
      ) as Promise<{ total: number }>,

      dbGet(
        `SELECT COALESCE(SUM(user_amount), 0) as total
         FROM cashback_transactions
         WHERE status = ? AND transaction_date >= ? AND transaction_date < ?`,
        ['confirmed', startOfLastMonth, startOfThisMonth]
      ) as Promise<{ total: number }>,

      // Money actually paid out via completed withdrawals (this/last month).
      dbGet(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM withdrawals
         WHERE status = ? AND processed_at >= ?`,
        ['completed', startOfThisMonth]
      ) as Promise<{ total: number }>,

      dbGet(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM withdrawals
         WHERE status = ? AND processed_at >= ? AND processed_at < ?`,
        ['completed', startOfLastMonth, startOfThisMonth]
      ) as Promise<{ total: number }>,

      dbGet(
        `SELECT COUNT(*) as count FROM users
         WHERE is_admin = 0 AND created_at >= ?`,
        [startOfThisWeek]
      ) as Promise<{ count: number }>,

      dbGet(
        `SELECT COUNT(*) as count FROM users
         WHERE is_admin = 0 AND created_at >= ? AND created_at < ?`,
        [startOfLastWeek, startOfThisWeek]
      ) as Promise<{ count: number }>,

      dbGet(`SELECT COUNT(*) as count FROM merchants`) as Promise<{ count: number }>,

      dbGet(
        `SELECT COUNT(*) as count FROM offers WHERE is_active = 1`
      ) as Promise<{ count: number }>,

      // Unified recent activity: most recent 10 confirmed/pending cashback transactions.
      dbAll(`
        SELECT
          ct.id, ct.amount, ct.status, ct.transaction_date,
          u.id as user_id, u.name as user_name, u.email as user_email,
          m.name as merchant_name, o.title as offer_title
        FROM cashback_transactions ct
        JOIN users u ON ct.user_id = u.id
        JOIN offers o ON ct.offer_id = o.id
        JOIN merchants m ON o.merchant_id = m.id
        ORDER BY ct.transaction_date DESC
        LIMIT 10
      `),
    ]);

    // CJ integration block — surfaces the state of the three CJ sync jobs so
    // an admin can tell at a glance whether the automation is healthy and
    // whether there are auto-imported merchants needing review.
    const [
      cjCommissionsCount,
      cjMerchantsLinked,
      cjUnmatchedCount,
      cjCommissionsSyncedAt,
      cjAdvertisersSyncedAt,
    ] = await Promise.all([
      dbGet(`SELECT COUNT(*) as count FROM cj_commissions`) as Promise<{ count: number }>,
      dbGet(`SELECT COUNT(*) as count FROM merchants WHERE cj_advertiser_id IS NOT NULL`) as Promise<{ count: number }>,
      // Merchants linked to CJ that haven't been enriched yet — they have a
      // cj_advertiser_id but cj_max_commission_rate is still null, which
      // suggests the advertiser sync hasn't found them or hasn't run yet.
      dbGet(
        `SELECT COUNT(*) as count FROM merchants
         WHERE cj_advertiser_id IS NOT NULL AND cj_max_commission_rate IS NULL`
      ) as Promise<{ count: number }>,
      dbGet(`SELECT MAX(created_at) as t FROM cj_commissions`) as Promise<{ t: string | null }>,
      dbGet(`SELECT MAX(cj_synced_at) as t FROM merchants`) as Promise<{ t: string | null }>,
    ]);

    const pctChange = (current: number, prior: number): number | null => {
      if (prior === 0) return current === 0 ? 0 : null; // null = no prior baseline
      return ((current - prior) / prior) * 100;
    };

    res.json({
      action_queue: {
        pending_withdrawals: {
          count: pendingWithdrawals.count,
          total_amount: pendingWithdrawals.total,
        },
        pending_transactions: {
          count: pendingTransactions.count,
        },
      },
      platform_metrics: {
        this_month: {
          commission_earned: thisMonthCommission.total,
          fee_revenue: thisMonthCommission.fee,
          coffer: thisMonthCommission.coffer,
          cashback_owed: thisMonthCashback.total,
          paid_out: thisMonthPaidOut.total,
        },
        last_month: {
          commission_earned: lastMonthCommission.total,
          fee_revenue: lastMonthCommission.fee,
          coffer: lastMonthCommission.coffer,
          cashback_owed: lastMonthCashback.total,
          paid_out: lastMonthPaidOut.total,
        },
        deltas: {
          commission_pct: pctChange(thisMonthCommission.total, lastMonthCommission.total),
          fee_pct: pctChange(thisMonthCommission.fee, lastMonthCommission.fee),
          coffer_pct: pctChange(thisMonthCommission.coffer, lastMonthCommission.coffer),
          cashback_pct: pctChange(thisMonthCashback.total, lastMonthCashback.total),
          paid_out_pct: pctChange(thisMonthPaidOut.total, lastMonthPaidOut.total),
        },
      },
      growth: {
        new_users_this_week: newUsersThisWeek.count,
        new_users_last_week: newUsersLastWeek.count,
        new_users_pct: pctChange(newUsersThisWeek.count, newUsersLastWeek.count),
        active_merchants: activeMerchants.count,
        active_offers: activeOffers.count,
      },
      cj: {
        commissions_imported: cjCommissionsCount.count,
        merchants_linked: cjMerchantsLinked.count,
        merchants_unenriched: cjUnmatchedCount.count,
        last_synced: {
          commissions: cjCommissionsSyncedAt.t,
          advertisers: cjAdvertisersSyncedAt.t,
        },
      },
      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
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
