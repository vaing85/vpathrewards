import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';

const router = express.Router();

const REFERRAL_BONUS_PERCENTAGE = 10.0; // 10% of referred user's cashback

// Get referral dashboard stats
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get total referrals
    const totalReferrals = await dbGet(
      'SELECT COUNT(*) as count FROM referral_relationships WHERE referrer_id = ?',
      [req.userId]
    ) as { count: number };

    // Get active referrals (users who have earned cashback)
    const activeReferrals = await dbGet(
      `SELECT COUNT(DISTINCT re.referred_id) as count
       FROM referral_relationships re
       JOIN cashback_transactions ct ON re.referred_id = ct.user_id
       WHERE re.referrer_id = ?`,
      [req.userId]
    ) as { count: number };

    // Get total referral earnings
    const totalEarnings = await dbGet(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM referral_earnings
       WHERE referrer_id = ? AND status = 'confirmed'`,
      [req.userId]
    ) as { total: number };

    // Get pending referral earnings
    const pendingEarnings = await dbGet(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM referral_earnings
       WHERE referrer_id = ? AND status = 'pending'`,
      [req.userId]
    ) as { total: number };

    // Get referred users list
    const referredUsers = await dbAll(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.total_earnings,
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
      [req.userId]
    );

    res.json({
      total_referrals: totalReferrals.count || 0,
      active_referrals: activeReferrals.count || 0,
      total_earnings: totalEarnings.total || 0,
      pending_earnings: pendingEarnings.total || 0,
      referred_users: referredUsers
    });
  } catch (error) {
    console.error('Error fetching referral dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral earnings history
router.get('/earnings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const earnings = await dbAll(
      `SELECT 
        re.*,
        u.name as referred_user_name,
        u.email as referred_user_email,
        ct.amount as transaction_amount,
        o.title as offer_title,
        m.name as merchant_name
       FROM referral_earnings re
       JOIN users u ON re.referred_id = u.id
       LEFT JOIN cashback_transactions ct ON re.transaction_id = ct.id
       LEFT JOIN offers o ON ct.offer_id = o.id
       LEFT JOIN merchants m ON o.merchant_id = m.id
       WHERE re.referrer_id = ?
       ORDER BY re.created_at DESC`,
      [req.userId]
    );

    res.json(earnings);
  } catch (error) {
    console.error('Error fetching referral earnings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get referral code and stats
router.get('/code', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const referralCode = await dbGet(
      'SELECT referral_code FROM user_referral_codes WHERE user_id = ?',
      [req.userId]
    ) as { referral_code: string } | undefined;

    if (!referralCode) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    const stats = await dbGet(
      `SELECT 
        COUNT(*) as total_referrals,
        COALESCE(SUM(CASE WHEN re.status = 'confirmed' THEN re.amount ELSE 0 END), 0) as total_earnings
       FROM referral_relationships rr
       LEFT JOIN referral_earnings re ON rr.referrer_id = re.referrer_id AND rr.referred_id = re.referred_id
       WHERE rr.referrer_id = ?`,
      [req.userId]
    ) as { total_referrals: number; total_earnings: number };

    res.json({
      referral_code: referralCode.referral_code,
      referral_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode.referral_code}`,
      total_referrals: stats.total_referrals || 0,
      total_earnings: stats.total_earnings || 0
    });
  } catch (error) {
    console.error('Error fetching referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// Helper function to create referral earnings when a referred user earns cashback
export const createReferralEarning = async (
  referredUserId: number,
  transactionId: number,
  cashbackAmount: number
) => {
  try {
    // Find who referred this user
    const referral = await dbGet(
      'SELECT referrer_id, referral_code FROM referral_relationships WHERE referred_id = ?',
      [referredUserId]
    ) as { referrer_id: number; referral_code: string } | undefined;

    if (!referral) {
      return; // User wasn't referred, no referral bonus
    }

    // Calculate referral bonus (10% of cashback amount)
    const bonusAmount = (cashbackAmount * REFERRAL_BONUS_PERCENTAGE) / 100;

    // Create referral earning record
    await dbRun(
      `INSERT INTO referral_earnings (referrer_id, referred_id, transaction_id, amount, bonus_percentage, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [referral.referrer_id, referredUserId, transactionId, bonusAmount, REFERRAL_BONUS_PERCENTAGE, 'pending']
    );

    // Update referrer's total earnings (will be confirmed when transaction is confirmed)
    // This will be handled when the cashback transaction is confirmed
  } catch (error) {
    console.error('Error creating referral earning:', error);
  }
};

// Helper function to confirm referral earnings when cashback is confirmed
export const confirmReferralEarning = async (transactionId: number) => {
  try {
    // Find referral earnings for this transaction
    const referralEarning = await dbGet(
      'SELECT * FROM referral_earnings WHERE transaction_id = ? AND status = ?',
      [transactionId, 'pending']
    ) as { id: number; referrer_id: number; amount: number } | undefined;

    if (!referralEarning) {
      return; // No referral earning for this transaction
    }

    // Update referral earning status to confirmed
    await dbRun(
      'UPDATE referral_earnings SET status = ? WHERE id = ?',
      ['confirmed', referralEarning.id]
    );

    // Add to referrer's total earnings
    await dbRun(
      'UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?',
      [referralEarning.amount, referralEarning.referrer_id]
    );
  } catch (error) {
    console.error('Error confirming referral earning:', error);
  }
};
