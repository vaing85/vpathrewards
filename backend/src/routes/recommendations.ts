/**
 * GET /api/recommendations
 * Returns AI-powered offer recommendations personalised for the authenticated user.
 * Uses Claude Haiku for speed. Results are cached per-user for 10 minutes.
 */
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet } from '../database';
import { get, set } from '../utils/cache';

const router = Router();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

let anthropic: Anthropic | null = null;
function getClient() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const cacheKey = `recs:${userId}`;
  const cached = get<object[]>(cacheKey);
  if (cached) return res.json({ recommendations: cached, cached: true });

  try {
    // Gather user context
    const [user, recentTx, favorites, allOffers] = await Promise.all([
      dbGet<{ name: string; total_earnings: number; subscription_plan: string }>(
        'SELECT name, total_earnings, subscription_plan FROM users WHERE id = ?', [userId]
      ),
      dbAll<{ merchant_name: string; amount: number; category: string }>(
        `SELECT m.name as merchant_name, ct.amount, m.category
         FROM cashback_transactions ct
         JOIN offers o ON ct.offer_id = o.id
         JOIN merchants m ON o.merchant_id = m.id
         WHERE ct.user_id = ?
         ORDER BY ct.transaction_date DESC LIMIT 10`, [userId]
      ),
      dbAll<{ name: string; category: string }>(
        `SELECT m.name, m.category FROM user_favorites uf
         JOIN merchants m ON uf.merchant_id = m.id
         WHERE uf.user_id = ?`, [userId]
      ),
      dbAll<{ id: number; merchant_id: number; title: string; cashback_rate: number; merchant_name: string; category: string }>(
        `SELECT o.id, o.merchant_id, o.title, o.cashback_rate, m.name as merchant_name, m.category
         FROM offers o JOIN merchants m ON o.merchant_id = m.id
         WHERE o.is_active = 1
         ORDER BY o.cashback_rate DESC LIMIT 40`
      ),
    ]);

    const userContext = {
      totalEarnings: user?.total_earnings ?? 0,
      plan: user?.subscription_plan ?? 'free',
      recentCategories: [...new Set(recentTx.map((t) => t.category))],
      favoriteCategories: [...new Set(favorites.map((f) => f.category))],
      recentMerchants: recentTx.map((t) => t.merchant_name),
    };

    const prompt = `You are a cashback recommendation engine for V PATHing Rewards.

User profile:
- Total earnings: $${userContext.totalEarnings.toFixed(2)}
- Plan: ${userContext.plan}
- Recent categories: ${userContext.recentCategories.join(', ') || 'none yet'}
- Favorite categories: ${userContext.favoriteCategories.join(', ') || 'none yet'}
- Recent merchants: ${userContext.recentMerchants.join(', ') || 'none yet'}

Available offers (id | merchant | category | cashback%):
${allOffers.map((o) => `${o.id} | ${o.merchant_name} | ${o.category} | ${o.cashback_rate}%`).join('\n')}

Pick the 6 best offers for this user. Consider: their category preferences, merchants they haven't used recently (discovery), and highest cashback rates.

Respond ONLY with a JSON array of objects. Each object must have:
- offer_id: number
- reason: string (one short sentence, max 10 words, why this fits the user)

Example: [{"offer_id": 3, "reason": "Matches your frequent electronics shopping."}]`;

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (response.content[0] as Anthropic.TextBlock).text.trim();
    // Strip markdown code fences if Claude wraps the response
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed: { offer_id: number; reason: string }[] = JSON.parse(text);

    // Hydrate with full offer data
    const offerMap = new Map(allOffers.map((o) => [o.id, o]));
    const recommendations = parsed
      .filter((p) => offerMap.has(p.offer_id))
      .map((p) => ({ ...offerMap.get(p.offer_id)!, reason: p.reason }));

    set(cacheKey, recommendations, CACHE_TTL);
    res.json({ recommendations, cached: false });
  } catch (err) {
    console.error('Recommendations error:', err);
    // Fallback: return top offers by cashback rate
    const fallback = await dbAll(
      `SELECT o.id, o.merchant_id, o.title, o.cashback_rate, m.name as merchant_name, m.category
       FROM offers o JOIN merchants m ON o.merchant_id = m.id
       WHERE o.is_active = 1
       ORDER BY o.cashback_rate DESC LIMIT 6`
    );
    res.json({ recommendations: fallback.map((o) => ({ ...o, reason: 'Top cashback rate available.' })), cached: false });
  }
});

export default router;
