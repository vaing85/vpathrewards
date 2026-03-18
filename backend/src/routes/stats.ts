import express from 'express';
import { dbGet } from '../database';
import { get, set, cacheKey } from '../utils/cache';

const router = express.Router();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Public platform stats (no auth) - for homepage (Phase 4: cached)
router.get('/', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<object>(key);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [usersResult, cashbackResult, offersResult, merchantsResult] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM users WHERE is_admin = 0') as Promise<{ count: number }>,
      dbGet(
        `SELECT COALESCE(SUM(amount), 0) as total FROM cashback_transactions WHERE status = 'confirmed'`
      ) as Promise<{ total: number }>,
      dbGet('SELECT COUNT(*) as count FROM offers WHERE is_active = 1') as Promise<{ count: number }>,
      dbGet('SELECT COUNT(*) as count FROM merchants') as Promise<{ count: number }>
    ]);

    const data = {
      total_users: usersResult?.count ?? 0,
      total_cashback_paid: parseFloat(String(cashbackResult?.total ?? 0)),
      active_offers: offersResult?.count ?? 0,
      total_merchants: merchantsResult?.count ?? 0
    };
    set(key, data, CACHE_TTL_MS);
    res.json(data);
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
