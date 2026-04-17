/**
 * Referral service: dashboard, earnings, leaderboard, code (read-only + code lookup).
 * Orchestration and DB; rewards-core handles bonus rules and create/confirm earning.
 */
import { dbAll, dbGet } from '../database';

export async function getDashboard(userId: number) {
  const totalReferrals = await dbGet(
    'SELECT COUNT(*) as count FROM referral_relationships WHERE referrer_id = ?',
    [userId]
  ) as { count: number };

  const activeReferrals = await dbGet(
    `SELECT COUNT(DISTINCT re.referred_id) as count
     FROM referral_relationships re
     JOIN cashback_transactions ct ON re.referred_id = ct.user_id
     WHERE re.referrer_id = ?`,
    [userId]
  ) as { count: number };

  const totalEarnings = await dbGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_id = ? AND status = 'confirmed'`,
    [userId]
  ) as { total: number };

  const pendingEarnings = await dbGet(
    `SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_id = ? AND status = 'pending'`,
    [userId]
  ) as { total: number };

  const referredUsers = await dbAll(
    `SELECT 
       u.id, u.name, u.email, u.total_earnings,
       rr.created_at as referred_at,
       COUNT(DISTINCT ct.id) as transaction_count,
       COALESCE(SUM(CASE WHEN ct.status = 'confirmed' THEN ct.amount ELSE 0 END), 0) as total_earned,
       COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as referral_bonus_earned
     FROM referral_relationships rr
     JOIN users u ON rr.referred_id = u.id
     LEFT JOIN cashback_transactions ct ON u.id = ct.user_id
     LEFT JOIN referral_earnings re ON rr.referred_id = re.referred_id AND re.referrer_id = rr.referrer_id
     WHERE rr.referrer_id = ?
     GROUP BY u.id, u.name, u.email, u.total_earnings, rr.created_at
     ORDER BY rr.created_at DESC`,
    [userId]
  );

  return {
    total_referrals: totalReferrals?.count ?? 0,
    active_referrals: activeReferrals?.count ?? 0,
    total_earnings: totalEarnings?.total ?? 0,
    pending_earnings: pendingEarnings?.total ?? 0,
    referred_users: referredUsers,
  };
}

export async function getEarnings(userId: number) {
  return dbAll(
    `SELECT re.*, u.name as referred_user_name, u.email as referred_user_email,
            ct.amount as transaction_amount, o.title as offer_title, m.name as merchant_name
     FROM referral_earnings re
     JOIN users u ON re.referred_id = u.id
     LEFT JOIN cashback_transactions ct ON re.transaction_id = ct.id
     LEFT JOIN offers o ON ct.offer_id = o.id
     LEFT JOIN merchants m ON o.merchant_id = m.id
     WHERE re.referrer_id = ?
     ORDER BY re.created_at DESC`,
    [userId]
  );
}

export async function getLeaderboard(userId: number, limit: number) {
  interface LeaderRow { id: number; name: string; total_referrals: number; total_earnings: number; }
  const leaderboard = await dbAll<LeaderRow>(
    `SELECT u.id, u.name,
            COUNT(rr.id) as total_referrals,
            COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as total_earnings
     FROM users u
     JOIN referral_relationships rr ON u.id = rr.referrer_id
     LEFT JOIN referral_earnings re ON rr.referrer_id = re.referrer_id AND rr.referred_id = re.referred_id
     GROUP BY u.id, u.name
     HAVING total_referrals > 0
     ORDER BY total_earnings DESC, total_referrals DESC
     LIMIT ?`,
    [limit]
  );

  const myStats = await dbGet(
    `SELECT COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as total_earnings,
            COUNT(rr.id) as total_referrals
     FROM referral_relationships rr
     LEFT JOIN referral_earnings re ON rr.referrer_id = re.referrer_id AND rr.referred_id = re.referred_id
     WHERE rr.referrer_id = ?`,
    [userId]
  ) as { total_earnings: number; total_referrals: number } | undefined;

  let my_rank: number | null = null;
  if (myStats && (myStats.total_referrals > 0 || myStats.total_earnings > 0)) {
    const rankRow = await dbGet(
      `SELECT COUNT(*) + 1 as r FROM (
        SELECT rr.referrer_id,
          COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as te,
          COUNT(rr.id) as tr
        FROM referral_relationships rr
        LEFT JOIN referral_earnings re ON rr.referrer_id = re.referrer_id AND rr.referred_id = re.referred_id
        GROUP BY rr.referrer_id
        HAVING (te > ?) OR (te = ? AND tr > ?)
      )`,
      [myStats.total_earnings, myStats.total_earnings, myStats.total_referrals]
    ) as { r: number };
    my_rank = rankRow?.r ?? null;
  }

  return {
    leaderboard: (leaderboard || []).map((row) => ({
      user_id: row.id,
      name: row.name,
      total_referrals: row.total_referrals,
      total_earnings: parseFloat(String(row.total_earnings || 0)),
    })),
    my_rank,
  };
}

export async function getCode(userId: number): Promise<{ referral_code: string; total_referrals: number; total_earnings: number } | null> {
  const referralCode = await dbGet(
    'SELECT referral_code FROM user_referral_codes WHERE user_id = ?',
    [userId]
  ) as { referral_code: string } | undefined;

  if (!referralCode) return null;

  const stats = await dbGet(
    `SELECT COUNT(*) as total_referrals,
            COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as total_earnings
     FROM referral_relationships rr
     LEFT JOIN referral_earnings re ON rr.referrer_id = re.referrer_id AND rr.referred_id = re.referred_id
     WHERE rr.referrer_id = ?`,
    [userId]
  ) as { total_referrals: number; total_earnings: number } | undefined;

  return {
    referral_code: referralCode.referral_code,
    total_referrals: stats?.total_referrals ?? 0,
    total_earnings: stats?.total_earnings ?? 0,
  };
}
