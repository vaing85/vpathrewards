import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';
import { createReferralEarning } from './referrals';
import { validateCashbackTrack } from '../middleware/validation';
import { createNotification } from './notifications';

const router = express.Router();

// Get user's cashback transactions
router.get('/transactions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const totalResult = await dbGet(`
      SELECT COUNT(*) as total
      FROM cashback_transactions
      WHERE user_id = ?
    `, [req.userId]) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    const transactions = await dbAll(`
      SELECT 
        ct.*,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        m.logo_url as merchant_logo
      FROM cashback_transactions ct
      JOIN offers o ON ct.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.user_id = ?
      ORDER BY ct.transaction_date DESC
      LIMIT ? OFFSET ?
    `, [req.userId, limitNum, offset]);
    
    res.json({
      data: transactions,
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
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's earnings summary
router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet('SELECT total_earnings FROM users WHERE id = ?', [req.userId]) as any;
    
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_earnings
      FROM cashback_transactions
      WHERE user_id = ?
    `, [req.userId]) as any;

    res.json({
      total_earnings: user?.total_earnings || 0,
      total_transactions: stats?.total_transactions || 0,
      pending_earnings: stats?.pending_earnings || 0,
      confirmed_earnings: stats?.confirmed_earnings || 0
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get cashback history with time-based grouping for charts
router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { group_by = 'day', days = 30, status } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysNum);
    const dateThresholdStr = dateThreshold.toISOString();

    let dateFormat = "DATE(transaction_date)";
    if (group_by === 'week') {
      dateFormat = "strftime('%Y-W%W', transaction_date)";
    } else if (group_by === 'month') {
      dateFormat = "strftime('%Y-%m', transaction_date)";
    }

    let statusFilter = '';
    const params: any[] = [req.userId, dateThresholdStr];
    
    if (status && (status === 'pending' || status === 'confirmed' || status === 'rejected')) {
      statusFilter = 'AND status = ?';
      params.push(status);
    }

    // Time-based grouped data
    const groupedData = await dbAll(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
      FROM cashback_transactions
      WHERE user_id = ? AND transaction_date >= ? ${statusFilter}
      GROUP BY ${dateFormat}
      ORDER BY period DESC
    `, params);

    // Cumulative earnings over time (calculate in JavaScript for better compatibility)
    const timeSeriesData = (groupedData || []).map((item: any) => ({
      period: item.period || '',
      amount: parseFloat(item.total_amount) || 0
    })).sort((a: any, b: any) => {
      if (!a.period || !b.period) return 0;
      return a.period.localeCompare(b.period);
    });
    
    let runningTotal = 0;
    const cumulativeData = timeSeriesData.map((item: any) => {
      runningTotal += item.amount;
      return {
        period: item.period,
        cumulative_earnings: runningTotal
      };
    });

    // By merchant breakdown
    const byMerchant = await dbAll(`
      SELECT 
        m.id,
        m.name,
        m.logo_url,
        COUNT(ct.id) as transaction_count,
        COALESCE(SUM(ct.amount), 0) as total_amount,
        COALESCE(AVG(ct.amount), 0) as avg_amount
      FROM cashback_transactions ct
      INNER JOIN offers o ON ct.offer_id = o.id
      INNER JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.user_id = ? AND ct.transaction_date >= ? ${statusFilter}
      GROUP BY m.id, m.name, m.logo_url
      ORDER BY total_amount DESC
      LIMIT 10
    `, params);

    // By category breakdown - OPTIMIZED: Use INNER JOIN
    const byCategory = await dbAll(`
      SELECT 
        m.category,
        COUNT(ct.id) as transaction_count,
        COALESCE(SUM(ct.amount), 0) as total_amount
      FROM cashback_transactions ct
      INNER JOIN offers o ON ct.offer_id = o.id
      INNER JOIN merchants m ON o.merchant_id = m.id
      WHERE ct.user_id = ? AND ct.transaction_date >= ? ${statusFilter}
      GROUP BY m.category
      ORDER BY total_amount DESC
    `, params);

    res.json({
      period_days: daysNum,
      group_by: group_by,
      time_series: groupedData || [],
      cumulative: cumulativeData,
      by_merchant: byMerchant || [],
      by_category: byCategory || []
    });
  } catch (error: any) {
    console.error('Error fetching cashback history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
});

// Get cashback calendar data (daily earnings)
router.get('/calendar', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.query;
    const yearNum = parseInt(year as string) || new Date().getFullYear();
    const monthNum = parseInt(month as string) || new Date().getMonth() + 1;

    const calendarData = await dbAll(`
      SELECT 
        DATE(transaction_date) as date,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as confirmed_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM cashback_transactions
      WHERE user_id = ?
        AND strftime('%Y', transaction_date) = ?
        AND strftime('%m', transaction_date) = ?
      GROUP BY DATE(transaction_date)
      ORDER BY date
    `, [req.userId, yearNum.toString(), monthNum.toString().padStart(2, '0')]);

    res.json({
      year: yearNum,
      month: monthNum,
      data: calendarData
    });
  } catch (error) {
    console.error('Error fetching cashback calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cashback Goals endpoints
router.get('/goals', authenticateToken, async (req: AuthRequest, res) => {
  try {
    interface GoalRow { id: number; start_date: string | null; end_date: string | null; target_amount: string; current_amount: number; is_completed: number; [k: string]: unknown; }
    interface TxRow { amount: string; transaction_date: string; }

    const goals = await dbAll<GoalRow>(`
      SELECT * FROM cashback_goals
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.userId]) || [];

    if (goals.length === 0) {
      return res.json([]);
    }

    // OPTIMIZED: Batch update all goals in a single query instead of N+1 queries
    // Get all confirmed transactions for the user first
    const allTransactions = await dbAll<TxRow>(`
      SELECT
        amount,
        transaction_date
      FROM cashback_transactions
      WHERE user_id = ? AND status = 'confirmed'
      ORDER BY transaction_date
    `, [req.userId]) || [];

    // Calculate current_amount for each goal in memory
    const goalUpdates: Array<{ id: number; current_amount: number; is_completed: number }> = [];

    for (const goal of goals) {
      let total = 0;

      // Filter transactions by goal date range in JavaScript (faster than multiple DB queries)
      for (const transaction of allTransactions) {
        const transDate = new Date(transaction.transaction_date);

        // Check date range
        if (goal.start_date && transDate < new Date(goal.start_date)) {
          continue;
        }
        if (goal.end_date && transDate > new Date(goal.end_date)) {
          continue;
        }

        total += parseFloat(transaction.amount) || 0;
      }

      goal.current_amount = total;
      goal.is_completed = goal.current_amount >= (parseFloat(goal.target_amount) || 0) ? 1 : 0;

      goalUpdates.push({
        id: goal.id,
        current_amount: goal.current_amount,
        is_completed: goal.is_completed
      });
    }

    // Batch update all goals in a single transaction (if SQLite supports it, otherwise update individually)
    // SQLite doesn't support batch UPDATE with CASE, so we'll update in a loop but it's still better than N+1
    // because we already have the data calculated
    for (const update of goalUpdates) {
      await dbRun(
        'UPDATE cashback_goals SET current_amount = ?, is_completed = ? WHERE id = ?',
        [update.current_amount, update.is_completed, update.id]
      );
    }

    res.json(goals);
  } catch (error: any) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    });
  }
});

router.post('/goals', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, target_amount, period_type, start_date, end_date } = req.body;

    if (!title || !target_amount) {
      return res.status(400).json({ error: 'Title and target amount are required' });
    }

    const result = await dbRun(
      `INSERT INTO cashback_goals (user_id, title, target_amount, period_type, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.userId, title, target_amount, period_type || 'monthly', start_date || null, end_date || null]
    );

    const goalId = (result as any).lastID;
    const goal = await dbGet('SELECT * FROM cashback_goals WHERE id = ?', [goalId]);

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/goals/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, target_amount, period_type, start_date, end_date } = req.body;

    // Verify goal belongs to user
    const goal = await dbGet('SELECT * FROM cashback_goals WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await dbRun(
      `UPDATE cashback_goals 
       SET title = ?, target_amount = ?, period_type = ?, start_date = ?, end_date = ?
       WHERE id = ? AND user_id = ?`,
      [title, target_amount, period_type, start_date, end_date, id, req.userId]
    );

    const updated = await dbGet('SELECT * FROM cashback_goals WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/goals/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify goal belongs to user
    const goal = await dbGet('SELECT * FROM cashback_goals WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await dbRun('DELETE FROM cashback_goals WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track a cashback transaction (simulated - in production, this would be called by affiliate network)
router.post('/track', authenticateToken, validateCashbackTrack, async (req: AuthRequest, res: import('express').Response) => {
  try {
    const { offer_id, amount } = req.body;

    if (!offer_id || !amount) {
      return res.status(400).json({ error: 'Offer ID and amount are required' });
    }

    // Verify offer exists
    const offer = await dbGet('SELECT * FROM offers WHERE id = ? AND is_active = 1', [offer_id]) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Load platform commission settings
    const platformSettings = await dbGet('SELECT * FROM platform_settings WHERE id = 1') as any;
    const commissionType: string = platformSettings?.commission_type || 'percentage';
    const platformShare: number = platformSettings?.platform_share ?? 25.0;
    const flatAmount: number = platformSettings?.flat_amount ?? 0.0;

    // Calculate gross cashback from affiliate offer rate
    const grossCashback = (amount * offer.cashback_rate) / 100;

    // Split: platform cut vs user payout
    let platformAmount: number;
    if (commissionType === 'flat') {
      platformAmount = Math.min(flatAmount, grossCashback);
    } else {
      platformAmount = grossCashback * (platformShare / 100);
    }
    const userAmount = grossCashback - platformAmount;

    // Create transaction recording both amounts
    const result = await dbRun(
      `INSERT INTO cashback_transactions (user_id, offer_id, amount, platform_amount, user_amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.userId, offer_id, grossCashback, platformAmount, userAmount, 'pending']
    );

    const transactionId = (result as any).lastID;

    // Update user's total earnings (only their share)
    await dbRun(
      'UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?',
      [userAmount, req.userId]
    );

    // Create in-app notification for the user
    createNotification(
      req.userId!,
      'cashback',
      'Cashback Pending',
      `$${userAmount.toFixed(2)} cashback from "${offer.title}" is pending confirmation.`
    ).catch(() => {});

    // Create referral earning if user was referred (async)
    createReferralEarning(req.userId!, transactionId, userAmount).catch(err => {
      console.error('Error creating referral earning:', err);
    });

    res.status(201).json({
      message: 'Cashback tracked successfully',
      gross_cashback: grossCashback,
      platform_amount: platformAmount,
      cashback_amount: userAmount
    });
  } catch (error) {
    console.error('Error tracking cashback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
