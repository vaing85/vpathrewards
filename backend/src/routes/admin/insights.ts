/**
 * GET /api/admin/insights — Claude-generated narrative summary of platform analytics.
 * Cached for 5 minutes to avoid redundant API calls.
 */
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbGet, dbAll, USE_PG } from '../../db';
import { get, set } from '../../utils/cache';

const ago7d = USE_PG ? "NOW() - INTERVAL '7 days'" : "${ago7d}";

const router = Router();
const CACHE_TTL = 5 * 60 * 1000;

let anthropic: Anthropic | null = null;
function getClient() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

router.get('/', authenticateAdmin, async (req: AdminRequest, res) => {
  const cacheKey = 'admin:insights';
  const cached = get<object>(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const [overview, topMerchants, recentWithdrawals, pendingWithdrawals] = await Promise.all([
      dbGet<{
        total_users: number; new_users_7d: number;
        total_cashback: number; cashback_7d: number;
        pending_withdrawals: number; pending_amount: number;
        active_offers: number;
      }>(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE is_admin = 0) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_admin = 0 AND created_at >= ${ago7d}) as new_users_7d,
          (SELECT COALESCE(SUM(amount),0) FROM cashback_transactions WHERE status='confirmed') as total_cashback,
          (SELECT COALESCE(SUM(amount),0) FROM cashback_transactions WHERE status='confirmed' AND transaction_date >= ${ago7d}) as cashback_7d,
          (SELECT COUNT(*) FROM withdrawals WHERE status='pending') as pending_withdrawals,
          (SELECT COALESCE(SUM(amount),0) FROM withdrawals WHERE status='pending') as pending_amount,
          (SELECT COUNT(*) FROM offers WHERE is_active=1) as active_offers
      `),
      dbAll<{ name: string; total: number; clicks: number }>(
        `SELECT m.name,
                COALESCE(SUM(ct.amount),0) as total,
                (SELECT COUNT(*) FROM affiliate_clicks WHERE offer_id IN (SELECT id FROM offers WHERE merchant_id=m.id)) as clicks
         FROM merchants m
         LEFT JOIN offers o ON o.merchant_id = m.id
         LEFT JOIN cashback_transactions ct ON ct.offer_id = o.id AND ct.status='confirmed'
         GROUP BY m.id ORDER BY total DESC LIMIT 5`
      ),
      dbGet<{ count: number; total: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total
         FROM withdrawals WHERE status='approved' AND processed_at >= ${ago7d}`
      ),
      dbGet<{ count: number; total: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM withdrawals WHERE status='pending'`
      ),
    ]);

    const prompt = `You are an analytics assistant for V PATHing Rewards, a cashback platform.
Generate a concise executive summary (3-4 paragraphs, plain text, no markdown, no bullet points).
Highlight notable trends, flag any concerns, and suggest one actionable improvement.

Platform data snapshot:
- Total users: ${overview?.total_users ?? 0} (${overview?.new_users_7d ?? 0} new last 7 days)
- Total cashback paid: $${(overview?.total_cashback ?? 0).toFixed(2)} ($${(overview?.cashback_7d ?? 0).toFixed(2)} last 7 days)
- Active offers: ${overview?.active_offers ?? 0}
- Pending withdrawals: ${pendingWithdrawals?.count ?? 0} totalling $${(pendingWithdrawals?.total ?? 0).toFixed(2)}
- Withdrawals approved last 7 days: ${recentWithdrawals?.count ?? 0} ($${(recentWithdrawals?.total ?? 0).toFixed(2)})
- Top 5 merchants by cashback generated:
${topMerchants.map((m, i) => `  ${i + 1}. ${m.name}: $${m.total.toFixed(2)} cashback, ${m.clicks} clicks`).join('\n')}`;

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = (response.content[0] as Anthropic.TextBlock).text.trim();
    const payload = { summary, generated_at: new Date().toISOString(), stats: overview };
    set(cacheKey, payload, CACHE_TTL);
    res.json({ ...payload, cached: false });
  } catch (err) {
    console.error('Admin insights error:', err);
    res.status(500).json({ error: 'Could not generate insights' });
  }
});

export default router;
