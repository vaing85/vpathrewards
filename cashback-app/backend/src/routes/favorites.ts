import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';

const router = express.Router();

// Get user's favorites
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query; // 'offers' or 'merchants' or 'all'
    
    let favorites: any[] = [];
    
    if (!type || type === 'all' || type === 'offers') {
      const favoriteOffers = await dbAll(`
        SELECT 
          uf.id as favorite_id,
          uf.created_at as favorited_at,
          o.*,
          m.name as merchant_name,
          m.logo_url as merchant_logo,
          m.category
        FROM user_favorites uf
        JOIN offers o ON uf.offer_id = o.id
        JOIN merchants m ON o.merchant_id = m.id
        WHERE uf.user_id = ? AND uf.offer_id IS NOT NULL
        ORDER BY uf.created_at DESC
      `, [req.userId]);
      favorites = favorites.concat(favoriteOffers.map(f => ({ ...f, type: 'offer' })));
    }
    
    if (!type || type === 'all' || type === 'merchants') {
      const favoriteMerchants = await dbAll(`
        SELECT 
          uf.id as favorite_id,
          uf.created_at as favorited_at,
          m.*,
          COUNT(DISTINCT o.id) as offer_count,
          MAX(o.cashback_rate) as max_cashback
        FROM user_favorites uf
        JOIN merchants m ON uf.merchant_id = m.id
        LEFT JOIN offers o ON m.id = o.merchant_id AND o.is_active = 1
        WHERE uf.user_id = ? AND uf.merchant_id IS NOT NULL
        GROUP BY m.id, uf.id, uf.created_at
        ORDER BY uf.created_at DESC
      `, [req.userId]);
      favorites = favorites.concat(favoriteMerchants.map(f => ({ ...f, type: 'merchant' })));
    }
    
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if item is favorited
router.get('/check', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { offer_id, merchant_id } = req.query;
    
    if (!offer_id && !merchant_id) {
      return res.status(400).json({ error: 'Either offer_id or merchant_id is required' });
    }
    
    let query = 'SELECT id FROM user_favorites WHERE user_id = ?';
    const params: any[] = [req.userId];
    
    if (offer_id) {
      query += ' AND offer_id = ?';
      params.push(parseInt(offer_id as string));
    } else {
      query += ' AND merchant_id = ?';
      params.push(parseInt(merchant_id as string));
    }
    
    const favorite = await dbGet(query, params);
    
    res.json({ is_favorited: !!favorite });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add to favorites
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { offer_id, merchant_id } = req.body;
    
    if (!offer_id && !merchant_id) {
      return res.status(400).json({ error: 'Either offer_id or merchant_id is required' });
    }
    
    if (offer_id && merchant_id) {
      return res.status(400).json({ error: 'Cannot favorite both offer and merchant at the same time' });
    }
    
    // Verify the item exists
    if (offer_id) {
      const offer = await dbGet('SELECT id FROM offers WHERE id = ?', [offer_id]);
      if (!offer) {
        return res.status(404).json({ error: 'Offer not found' });
      }
    } else {
      const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchant_id]);
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
    }
    
    // Check if already favorited
    let checkQuery = 'SELECT id FROM user_favorites WHERE user_id = ?';
    const checkParams: any[] = [req.userId];
    if (offer_id) {
      checkQuery += ' AND offer_id = ?';
      checkParams.push(offer_id);
    } else {
      checkQuery += ' AND merchant_id = ?';
      checkParams.push(merchant_id);
    }
    
    const existing = await dbGet(checkQuery, checkParams);
    if (existing) {
      return res.status(400).json({ error: 'Item is already in favorites' });
    }
    
    // Add to favorites
    await dbRun(
      'INSERT INTO user_favorites (user_id, offer_id, merchant_id) VALUES (?, ?, ?)',
      [req.userId, offer_id || null, merchant_id || null]
    );
    
    res.status(201).json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove from favorites
router.delete('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { offer_id, merchant_id, favorite_id } = req.query;
    
    if (!offer_id && !merchant_id && !favorite_id) {
      return res.status(400).json({ error: 'Either offer_id, merchant_id, or favorite_id is required' });
    }
    
    let query = 'DELETE FROM user_favorites WHERE user_id = ?';
    const params: any[] = [req.userId];
    
    if (favorite_id) {
      query += ' AND id = ?';
      params.push(parseInt(favorite_id as string));
    } else if (offer_id) {
      query += ' AND offer_id = ?';
      params.push(parseInt(offer_id as string));
    } else {
      query += ' AND merchant_id = ?';
      params.push(parseInt(merchant_id as string));
    }
    
    const result = await dbRun(query, params);
    const deleted = (result as any).changes;
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get favorites count
router.get('/count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const counts = await dbGet(`
      SELECT 
        COUNT(CASE WHEN offer_id IS NOT NULL THEN 1 END) as offers_count,
        COUNT(CASE WHEN merchant_id IS NOT NULL THEN 1 END) as merchants_count,
        COUNT(*) as total_count
      FROM user_favorites
      WHERE user_id = ?
    `, [req.userId]) as { offers_count: number; merchants_count: number; total_count: number };
    
    res.json(counts || { offers_count: 0, merchants_count: 0, total_count: 0 });
  } catch (error) {
    console.error('Error fetching favorites count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
