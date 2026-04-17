/**
 * GET /api/leaderboard — top earners (opt-in only, monthly + all-time)
 * POST /api/leaderboard/optin — toggle leaderboard opt-in for the user
 */
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';
import { get, set, cacheKey } from '../utils/cache';

const router = Router();
const CACHE_TTL = 60 * 1000; // 1 min

router.get('/', async (req, res) => {
  const key = cacheKey(req);
  const cached = get<object>(key);
  if (cached) return res.json(cached);

  try {
    const [monthly, allTime] = await Promise.all([
      dbAll(
        `SELECT u.name, u.total_earnings,
                COALESCE(SUM(ct.amount), 0) as monthly_earnings,
                u.subscription_plan
         FROM users u
         LEFT JOIN cashback_transactions ct
           ON ct.user_id = u.id
           AND ct.status = 'confirmed'
           AND ct.transaction_date >= date('now', 'start of month')
         WHERE u.is_admin = 0 AND u.leaderboard_opt_in = 1
         GROUP BY u.id
         ORDER BY monthly_earnings DESC
         LIMIT 20`
      ),
      dbAll(
        `SELECT u.name, u.total_earnings, u.subscription_plan
         FROM users u
         WHERE u.is_admin = 0 AND u.leaderboard_opt_in = 1
         ORDER BY u.total_earnings DESC
         LIMIT 20`
      ),
    ]);

    const payload = { monthly, all_time: allTime };
    set(key, payload, CACHE_TTL);
    res.json(payload);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's opt-in status + rank
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet<{ leaderboard_opt_in: number; total_earnings: number }>(
      'SELECT leaderboard_opt_in, total_earnings FROM users WHERE id = ?', [req.userId]
    );
    const rank = user?.leaderboard_opt_in
      ? await dbGet<{ rank: number }>(
          `SELECT COUNT(*) + 1 as rank FROM users
           WHERE is_admin = 0 AND leaderboard_opt_in = 1 AND total_earnings > ?`,
          [user.total_earnings]
        )
      : null;
    res.json({ opted_in: !!user?.leaderboard_opt_in, rank: rank?.rank ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/optin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet<{ leaderboard_opt_in: number }>(
      'SELECT leaderboard_opt_in FROM users WHERE id = ?', [req.userId]
    );
    const newVal = user?.leaderboard_opt_in ? 0 : 1;
    await dbRun('UPDATE users SET leaderboard_opt_in = ? WHERE id = ?', [newVal, req.userId]);
    res.json({ opted_in: !!newVal, message: newVal ? 'You joined the leaderboard.' : 'You left the leaderboard.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
