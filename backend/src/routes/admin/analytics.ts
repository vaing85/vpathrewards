import express from 'express';
import { authenticateAdmin } from '../../middleware/adminAuth';
import { dbAll, dbGet } from '../../database';

const router = express.Router();

// Get overall analytics
router.get('/overview', authenticateAdmin, async (req, res) => {
  try {
    const [clicksStats, conversionsStats, topOffers, topMerchants] = await Promise.all([
      dbGet(`
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT offer_id) as unique_offers,
          SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as converted_clicks
        FROM affiliate_clicks
      `) as Promise<any>,
      dbGet(`
        SELECT 
          COUNT(*) as total_conversions,
          SUM(order_amount) as total_revenue,
          SUM(commission_amount) as total_commissions,
          AVG(commission_amount) as avg_commission
        FROM conversions
        WHERE status = 'pending' OR status = 'confirmed'
      `) as Promise<any>,
      dbAll(`
        SELECT 
          o.id,
          o.title,
          m.name as merchant_name,
          COUNT(ac.id) as click_count,
          COUNT(c.id) as conversion_count,
          SUM(c.commission_amount) as total_commission
        FROM offers o
        JOIN merchants m ON o.merchant_id = m.id
        LEFT JOIN affiliate_clicks ac ON o.id = ac.offer_id
        LEFT JOIN conversions c ON ac.id = c.click_id
        GROUP BY o.id
        ORDER BY click_count DESC
        LIMIT 10
      `) as Promise<any[]>,
      dbAll(`
        SELECT 
          m.id,
          m.name,
          COUNT(DISTINCT ac.id) as click_count,
          COUNT(DISTINCT c.id) as conversion_count,
          SUM(c.commission_amount) as total_commission
        FROM merchants m
        LEFT JOIN offers o ON m.id = o.merchant_id
        LEFT JOIN affiliate_clicks ac ON o.id = ac.offer_id
        LEFT JOIN conversions c ON ac.id = c.click_id
        GROUP BY m.id
        ORDER BY click_count DESC
        LIMIT 10
      `) as Promise<any[]>
    ]);

    res.json({
      clicks: clicksStats,
      conversions: conversionsStats,
      top_offers: topOffers,
      top_merchants: topMerchants
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get click analytics with date range
router.get('/clicks', authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, offer_id } = req.query;
    
    let query = `
      SELECT 
        ac.*,
        o.title as offer_title,
        m.name as merchant_name,
        u.email as user_email,
        CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as converted
      FROM affiliate_clicks ac
      JOIN offers o ON ac.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      LEFT JOIN users u ON ac.user_id = u.id
      LEFT JOIN conversions c ON ac.id = c.click_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (start_date) {
      query += ` AND ac.clicked_at >= ?`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND ac.clicked_at <= ?`;
      params.push(end_date);
    }
    
    if (offer_id) {
      query += ` AND ac.offer_id = ?`;
      params.push(offer_id);
    }
    
    query += ` ORDER BY ac.clicked_at DESC LIMIT 500`;
    
    const clicks = await dbAll(query, params);
    res.json(clicks);
  } catch (error) {
    console.error('Error fetching click analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversion analytics
router.get('/conversions', authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    
    let query = `
      SELECT 
        c.*,
        o.title as offer_title,
        m.name as merchant_name,
        u.email as user_email,
        ac.clicked_at
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN affiliate_clicks ac ON c.click_id = ac.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (start_date) {
      query += ` AND c.conversion_date >= ?`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND c.conversion_date <= ?`;
      params.push(end_date);
    }
    
    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY c.conversion_date DESC LIMIT 500`;
    
    const conversions = await dbAll(query, params);
    res.json(conversions);
  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
