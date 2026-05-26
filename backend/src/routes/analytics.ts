import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet } from '../database';
import { getEngagementMetrics, getRevenueAnalytics } from '../services/analyticsQueries';

const router = express.Router();

// Get user engagement metrics
router.get('/engagement', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string) || 30;
    res.json(await getEngagementMetrics(daysNum));
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular merchants/offers
router.get('/popular', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type = 'all', days = 30, limit = 10 } = req.query;
    const daysNum = parseInt(days as string) || 30;
    const limitNum = parseInt(limit as string) || 10;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysNum);
    const dateThresholdStr = dateThreshold.toISOString();

    let results: any = {};

    if (type === 'all' || type === 'offers') {
      // OPTIMIZED: Use subqueries to avoid expensive LEFT JOINs with aggregations
      const popularOffers = await dbAll(`
        SELECT 
          o.id,
          o.title,
          o.cashback_rate,
          m.name as merchant_name,
          m.logo_url as merchant_logo,
          COALESCE(click_stats.click_count, 0) as click_count,
          COALESCE(click_stats.unique_users, 0) as unique_users,
          COALESCE(conversion_stats.conversion_count, 0) as conversion_count,
          COALESCE(conversion_stats.total_commission, 0) as total_commission
        FROM offers o
        INNER JOIN merchants m ON o.merchant_id = m.id
        LEFT JOIN (
          SELECT 
            offer_id,
            COUNT(*) as click_count,
            COUNT(DISTINCT user_id) as unique_users
          FROM affiliate_clicks
          WHERE clicked_at >= ?
          GROUP BY offer_id
        ) click_stats ON o.id = click_stats.offer_id
        LEFT JOIN (
          SELECT 
            ac.offer_id,
            COUNT(DISTINCT c.id) as conversion_count,
            SUM(c.commission_amount) as total_commission
          FROM conversions c
          INNER JOIN affiliate_clicks ac ON c.click_id = ac.id
          WHERE ac.clicked_at >= ?
          GROUP BY ac.offer_id
        ) conversion_stats ON o.id = conversion_stats.offer_id
        WHERE o.is_active = 1
        ORDER BY click_count DESC, conversion_count DESC
        LIMIT ?
      `, [dateThresholdStr, dateThresholdStr, limitNum]);
      
      results.offers = popularOffers;
    }

    if (type === 'all' || type === 'merchants') {
      // OPTIMIZED: Use subqueries instead of multiple LEFT JOINs
      const popularMerchants = await dbAll(`
        SELECT 
          m.id,
          m.name,
          m.logo_url,
          m.category,
          COALESCE(offer_stats.offer_count, 0) as offer_count,
          COALESCE(click_stats.click_count, 0) as click_count,
          COALESCE(click_stats.unique_users, 0) as unique_users,
          COALESCE(conversion_stats.conversion_count, 0) as conversion_count,
          COALESCE(conversion_stats.total_commission, 0) as total_commission
        FROM merchants m
        LEFT JOIN (
          SELECT 
            merchant_id,
            COUNT(*) as offer_count
          FROM offers
          WHERE is_active = 1
          GROUP BY merchant_id
        ) offer_stats ON m.id = offer_stats.merchant_id
        LEFT JOIN (
          SELECT 
            o.merchant_id,
            COUNT(DISTINCT ac.id) as click_count,
            COUNT(DISTINCT ac.user_id) as unique_users
          FROM affiliate_clicks ac
          INNER JOIN offers o ON ac.offer_id = o.id
          WHERE ac.clicked_at >= ? AND o.is_active = 1
          GROUP BY o.merchant_id
        ) click_stats ON m.id = click_stats.merchant_id
        LEFT JOIN (
          SELECT 
            o.merchant_id,
            COUNT(DISTINCT c.id) as conversion_count,
            SUM(c.commission_amount) as total_commission
          FROM conversions c
          INNER JOIN affiliate_clicks ac ON c.click_id = ac.id
          INNER JOIN offers o ON ac.offer_id = o.id
          WHERE ac.clicked_at >= ? AND o.is_active = 1
          GROUP BY o.merchant_id
        ) conversion_stats ON m.id = conversion_stats.merchant_id
        WHERE click_stats.click_count > 0
        ORDER BY click_stats.click_count DESC, conversion_stats.conversion_count DESC
        LIMIT ?
      `, [dateThresholdStr, dateThresholdStr, limitNum]);
      
      results.merchants = popularMerchants;
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversion rate analytics
router.get('/conversion-rates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { days = 30, group_by = 'day' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysNum);
    const dateThresholdStr = dateThreshold.toISOString();

    let dateFormat = "DATE(ac.clicked_at)";
    if (group_by === 'week') {
      dateFormat = "strftime('%Y-W%W', ac.clicked_at)";
    } else if (group_by === 'month') {
      dateFormat = "strftime('%Y-%m', ac.clicked_at)";
    }

    const conversionRates = await dbAll(`
      SELECT 
        ${dateFormat} as period,
        COUNT(DISTINCT ac.id) as total_clicks,
        COUNT(DISTINCT c.id) as conversions,
        CASE 
          WHEN COUNT(DISTINCT ac.id) > 0 
          THEN ROUND((COUNT(DISTINCT c.id) * 100.0 / COUNT(DISTINCT ac.id)), 2)
          ELSE 0 
        END as conversion_rate,
        SUM(c.commission_amount) as total_commission
      FROM affiliate_clicks ac
      LEFT JOIN conversions c ON ac.id = c.click_id
      WHERE ac.clicked_at >= ?
      GROUP BY ${dateFormat}
      ORDER BY period DESC
    `, [dateThresholdStr]);

    // Overall conversion rate
    const overall = await dbGet(`
      SELECT 
        COUNT(DISTINCT ac.id) as total_clicks,
        COUNT(DISTINCT c.id) as conversions,
        CASE 
          WHEN COUNT(DISTINCT ac.id) > 0 
          THEN ROUND((COUNT(DISTINCT c.id) * 100.0 / COUNT(DISTINCT ac.id)), 2)
          ELSE 0 
        END as conversion_rate
      FROM affiliate_clicks ac
      LEFT JOIN conversions c ON ac.id = c.click_id
      WHERE ac.clicked_at >= ?
    `, [dateThresholdStr]) as { total_clicks: number; conversions: number; conversion_rate: number };

    res.json({
      period_days: daysNum,
      group_by: group_by,
      overall: overall,
      breakdown: conversionRates
    });
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue analytics
router.get('/revenue', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { days = 30, group_by = 'day' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    res.json(await getRevenueAnalytics(daysNum, group_by as string));
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity tracking
router.get('/user-activity', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string) || 7;
    
    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysNum);
    const dateThresholdStr = dateThreshold.toISOString();

    // Daily active users
    const dailyActiveUsers = await dbAll(`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_clicks
      FROM affiliate_clicks
      WHERE clicked_at >= ? AND user_id IS NOT NULL
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC
    `, [dateThresholdStr]);

    // User signups over time
    const signups = await dbAll(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= ? AND is_admin = 0
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [dateThresholdStr]);

    // User retention (users who came back)
    const returningUsers = await dbGet(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM affiliate_clicks
      WHERE clicked_at >= ? 
        AND user_id IN (
          SELECT DISTINCT user_id 
          FROM affiliate_clicks 
          WHERE clicked_at < ?
        )
    `, [dateThresholdStr, dateThresholdStr]) as { count: number };

    res.json({
      period_days: daysNum,
      daily_active_users: dailyActiveUsers,
      signups: signups,
      returning_users: returningUsers.count || 0
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
