import express from 'express';
import { dbAll } from '../database';
import { get, set, cacheKey } from '../utils/cache';

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000; // 1 minute (Phase 4)

// Get featured offers (highest cashback rates, limited number)
router.get('/offers', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<unknown>(key);
  if (cached) return res.json(cached);
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    const offers = await dbAll(`
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
      ORDER BY o.cashback_rate DESC, o.created_at DESC
      LIMIT ?
    `, [limit]);
    set(key, offers, CACHE_TTL_MS);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching featured offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending merchants (most clicks/conversions, highest cashback)
// OPTIMIZED: Use subqueries instead of multiple LEFT JOINs for better performance
router.get('/merchants', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<unknown>(key);
  if (cached) return res.json(cached);
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    // Optimized query using subqueries to avoid expensive JOINs
    const merchants = await dbAll(`
      SELECT 
        m.*,
        COALESCE(offer_stats.offer_count, 0) as offer_count,
        COALESCE(offer_stats.max_cashback, 0) as max_cashback,
        COALESCE(click_stats.click_count, 0) as click_count,
        COALESCE(conversion_stats.conversion_count, 0) as conversion_count
      FROM merchants m
      LEFT JOIN (
        SELECT 
          merchant_id,
          COUNT(*) as offer_count,
          MAX(cashback_rate) as max_cashback
        FROM offers
        WHERE is_active = 1
        GROUP BY merchant_id
      ) offer_stats ON m.id = offer_stats.merchant_id
      LEFT JOIN (
        SELECT 
          o.merchant_id,
          COUNT(DISTINCT ac.id) as click_count
        FROM affiliate_clicks ac
        JOIN offers o ON ac.offer_id = o.id
        WHERE o.is_active = 1
        GROUP BY o.merchant_id
      ) click_stats ON m.id = click_stats.merchant_id
      LEFT JOIN (
        SELECT 
          o.merchant_id,
          COUNT(DISTINCT c.id) as conversion_count
        FROM conversions c
        JOIN offers o ON c.offer_id = o.id
        WHERE o.is_active = 1
        GROUP BY o.merchant_id
      ) conversion_stats ON m.id = conversion_stats.merchant_id
      WHERE m.id IS NOT NULL
      ORDER BY 
        (COALESCE(click_stats.click_count, 0) * 0.3 + COALESCE(conversion_stats.conversion_count, 0) * 0.7) DESC,
        COALESCE(offer_stats.max_cashback, 0) DESC,
        COALESCE(offer_stats.offer_count, 0) DESC
      LIMIT ?
    `, [limit]);
    set(key, merchants, CACHE_TTL_MS);
    res.json(merchants);
  } catch (error) {
    console.error('Error fetching trending merchants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recently added offers
router.get('/recent-offers', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<unknown>(key);
  if (cached) return res.json(cached);
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    const days = parseInt(req.query.days as string) || 30;
    
    // Calculate the date X days ago
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateThresholdStr = dateThreshold.toISOString();
    
    const offers = await dbAll(`
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
        AND o.created_at >= ?
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [dateThresholdStr, limit]);
    set(key, offers, CACHE_TTL_MS);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching recent offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expiring soon offers (if we add expiry_date field in future)
// For now, return offers that might be expiring (older offers)
router.get('/expiring-offers', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<unknown>(key);
  if (cached) return res.json(cached);
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    // Since we don't have expiry_date yet, we'll return offers that are older
    // In production, you'd add an expiry_date field to offers table
    // Calculate date 60 days ago
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - 60);
    const dateThresholdStr = dateThreshold.toISOString();
    
    const offers = await dbAll(`
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
        AND o.created_at <= ?
      ORDER BY o.created_at ASC
      LIMIT ?
    `, [dateThresholdStr, limit]);
    set(key, offers, CACHE_TTL_MS);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching expiring offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get offers by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit, sort } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    
    let query = `
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
        AND m.category = ?
    `;
    
    const params: any[] = [category];
    
    // Sort options
    switch (sort) {
      case 'cashback_asc':
        query += ` ORDER BY o.cashback_rate ASC, m.name`;
        break;
      case 'cashback_desc':
        query += ` ORDER BY o.cashback_rate DESC, m.name`;
        break;
      case 'newest':
        query += ` ORDER BY o.created_at DESC`;
        break;
      default:
        query += ` ORDER BY o.cashback_rate DESC, m.name`;
    }
    
    query += ` LIMIT ?`;
    params.push(limitNum);
    
    const offers = await dbAll(query, params);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching category offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
