import express from 'express';
import { dbAll, dbGet } from '../database';
import { appConfig } from '../config/appConfig';
import { getClientIp, getStateFromIp, isGeoBlocked } from '../utils/geoFilter';

const router = express.Router();

// Get all active offers with search and filter support
router.get('/', async (req, res) => {
  try {
    const { search, category, minCashback, maxCashback, merchantId, sort, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
    `;
    
    const params: any[] = [];
    
    // Search by title, description, or merchant name
    if (search) {
      query += ` AND (o.title LIKE ? OR o.description LIKE ? OR m.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Filter by category
    if (category) {
      query += ` AND m.category = ?`;
      params.push(category);
    }
    
    // Filter by merchant
    if (merchantId) {
      query += ` AND o.merchant_id = ?`;
      params.push(parseInt(merchantId as string));
    }
    
    // Filter by minimum cashback rate
    if (minCashback) {
      query += ` AND o.cashback_rate >= ?`;
      params.push(parseFloat(minCashback as string));
    }
    
    // Filter by maximum cashback rate
    if (maxCashback) {
      query += ` AND o.cashback_rate <= ?`;
      params.push(parseFloat(maxCashback as string));
    }
    
    // Get total count for pagination (build count query separately)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.is_active = 1
    `;
    const countParams: any[] = [];
    
    // Apply same filters to count query
    if (search) {
      countQuery += ` AND (o.title LIKE ? OR o.description LIKE ? OR m.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (category) {
      countQuery += ` AND m.category = ?`;
      countParams.push(category);
    }
    if (merchantId) {
      countQuery += ` AND o.merchant_id = ?`;
      countParams.push(parseInt(merchantId as string));
    }
    if (minCashback) {
      countQuery += ` AND o.cashback_rate >= ?`;
      countParams.push(parseFloat(minCashback as string));
    }
    if (maxCashback) {
      countQuery += ` AND o.cashback_rate <= ?`;
      countParams.push(parseFloat(maxCashback as string));
    }
    
    const totalResult = await dbGet(countQuery, countParams) as { total: number };
    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limitNum);
    
    // Sort options
    switch (sort) {
      case 'cashback_asc':
        query += ` ORDER BY o.cashback_rate ASC, m.name`;
        break;
      case 'cashback_desc':
        query += ` ORDER BY o.cashback_rate DESC, m.name`;
        break;
      case 'name':
        query += ` ORDER BY m.name ASC, o.cashback_rate DESC`;
        break;
      case 'newest':
        query += ` ORDER BY o.created_at DESC`;
        break;
      default:
        query += ` ORDER BY o.cashback_rate DESC, m.name`;
    }
    
    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    
    const rawOffers = await dbAll(query, params) as any[];

    // Geo-filter: remove offers that are not available in the user's state
    const clientIp = getClientIp(req as any);
    const userState = await getStateFromIp(clientIp);
    const offers = rawOffers.filter((o) => !isGeoBlocked(o.excluded_states, userState));

    res.json({
      data: offers || [],
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
    console.error('Error fetching offers:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: appConfig.isDevelopment ? error?.message : undefined
    });
  }
});

// Get offer by ID
router.get('/:id', async (req, res) => {
  try {
    const offer = await dbGet(`
      SELECT 
        o.*,
        m.name as merchant_name,
        m.logo_url as merchant_logo,
        m.website_url as merchant_website,
        m.category
      FROM offers o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ?
    `, [req.params.id]);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Geo-check: block if offer is not available in the user's state
    const clientIp = getClientIp(req as any);
    const userState = await getStateFromIp(clientIp);
    if (isGeoBlocked((offer as any).excluded_states, userState)) {
      return res.status(403).json({ error: 'This offer is not available in your state.' });
    }

    res.json(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
