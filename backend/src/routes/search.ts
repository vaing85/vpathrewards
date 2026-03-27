import express from 'express';
import { dbAll } from '../database';

const router = express.Router();

// Unified search endpoint for merchants and offers
router.get('/', async (req, res) => {
  try {
    const { q, type } = req.query;
    const searchTerm = q as string;
    
    if (!searchTerm) {
      return res.json({ merchants: [], offers: [] });
    }
    
    const searchPattern = `%${searchTerm}%`;
    
    let results: any = {
      merchants: [],
      offers: []
    };
    
    // Search merchants if type is 'all' or 'merchants'
    if (!type || type === 'all' || type === 'merchants') {
      const merchants = await dbAll(`
        SELECT
          m.*,
          COALESCE(offer_stats.offer_count, 0) as offer_count,
          COALESCE(offer_stats.max_cashback, 0) as max_cashback
        FROM merchants m
        LEFT JOIN (
          SELECT merchant_id, COUNT(*) as offer_count, MAX(cashback_rate) as max_cashback
          FROM offers
          WHERE is_active = 1
          GROUP BY merchant_id
        ) offer_stats ON m.id = offer_stats.merchant_id
        WHERE m.name LIKE ? OR m.description LIKE ?
        ORDER BY m.name
        LIMIT 10
      `, [searchPattern, searchPattern]);
      results.merchants = merchants;
    }
    
    // Search offers if type is 'all' or 'offers'
    if (!type || type === 'all' || type === 'offers') {
      const offers = await dbAll(`
        SELECT 
          o.*,
          m.name as merchant_name,
          m.logo_url as merchant_logo,
          m.category
        FROM offers o
        JOIN merchants m ON o.merchant_id = m.id
        WHERE o.is_active = 1
          AND (o.title LIKE ? OR o.description LIKE ? OR m.name LIKE ?)
        ORDER BY o.cashback_rate DESC
        LIMIT 10
      `, [searchPattern, searchPattern, searchPattern]);
      results.offers = offers;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await dbAll(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM merchants
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY category
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
