import express from 'express';
import { dbAll, dbGet } from '../database';

const router = express.Router();

// Get all merchants with search and filter support
router.get('/', async (req, res) => {
  try {
    const { search, category, minCashback, sort, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        m.*,
        COUNT(o.id) as offer_count,
        MAX(o.cashback_rate) as max_cashback
      FROM merchants m
      LEFT JOIN offers o ON m.id = o.merchant_id AND o.is_active = 1
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Search by name or description
    if (search) {
      query += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // Filter by category
    if (category) {
      query += ` AND m.category = ?`;
      params.push(category);
    }
    
    // Filter by minimum cashback rate
    if (minCashback) {
      query += ` AND (SELECT MAX(cashback_rate) FROM offers WHERE merchant_id = m.id AND is_active = 1) >= ?`;
      params.push(parseFloat(minCashback as string));
    }
    
    query += ` GROUP BY m.id`;
    
    // Sort options
    switch (sort) {
      case 'cashback':
        query += ` ORDER BY max_cashback DESC, m.name`;
        break;
      case 'name':
        query += ` ORDER BY m.name ASC`;
        break;
      case 'offers':
        query += ` ORDER BY offer_count DESC, m.name`;
        break;
      default:
        query += ` ORDER BY m.name`;
    }
    
    // Get total count for pagination (build count query separately)
    let countQuery = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM merchants m
      LEFT JOIN offers o ON m.id = o.merchant_id AND o.is_active = 1
      WHERE 1=1
    `;
    const countParams: any[] = [];
    
    // Apply same filters to count query
    if (search) {
      countQuery += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    if (category) {
      countQuery += ` AND m.category = ?`;
      countParams.push(category);
    }
    if (minCashback) {
      countQuery += ` AND (SELECT MAX(cashback_rate) FROM offers WHERE merchant_id = m.id AND is_active = 1) >= ?`;
      countParams.push(parseFloat(minCashback as string));
    }
    
    const totalResult = await dbGet(countQuery, countParams) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    
    const merchants = await dbAll(query, params);
    
    res.json({
      data: merchants || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Get merchant by ID
router.get('/:id', async (req, res) => {
  try {
    const merchant = await dbGet('SELECT * FROM merchants WHERE id = ?', [req.params.id]);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }
    res.json(merchant);
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get offers for a merchant
router.get('/:id/offers', async (req, res) => {
  try {
    const offers = await dbAll(`
      SELECT o.*, m.name as merchant_name
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.merchant_id = ? AND o.is_active = 1
      ORDER BY o.cashback_rate DESC
    `, [req.params.id]);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
