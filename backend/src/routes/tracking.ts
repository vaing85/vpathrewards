import express from 'express';
import { randomBytes } from 'crypto';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';
import { createReferralEarning } from './referrals';
import { computePayout } from '../services/rewards-core';
import { getUserCommissionShare } from '../services/tierService';

const generateSessionId = (): string => `sess_${Date.now()}_${randomBytes(8).toString('hex')}`;

const router = express.Router();

// Generate or get user's referral code
router.get('/referral-code', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let referralCode = await dbGet(
      'SELECT referral_code FROM user_referral_codes WHERE user_id = ?',
      [req.userId]
    ) as { referral_code: string } | undefined;

    if (!referralCode) {
      // Generate unique referral code
      const code = `REF${req.userId}${Date.now().toString().slice(-6)}`;
      await dbRun(
        'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
        [req.userId, code]
      );
      referralCode = { referral_code: code };
    }

    res.json({
      referral_code: referralCode.referral_code,
      referral_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ref/${referralCode.referral_code}`
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track affiliate link click
router.post('/click', async (req, res) => {
  try {
    const { offer_id, session_id, referral_code } = req.body;
    const ip_address = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const user_agent = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || 'direct';

    if (!offer_id) {
      return res.status(400).json({ error: 'Offer ID is required' });
    }

    // Verify offer exists
    const offer = await dbGet('SELECT * FROM offers WHERE id = ? AND is_active = 1', [offer_id]) as any;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Get user_id from referral code if provided
    let userId = null;
    if (referral_code) {
      const userRef = await dbGet(
        'SELECT user_id FROM user_referral_codes WHERE referral_code = ?',
        [referral_code]
      ) as { user_id: number } | undefined;
      if (userRef) {
        userId = userRef.user_id;
      }
    }

    // Generate session ID if not provided
    const trackingSessionId = session_id || generateSessionId();

    // Create click record
    const result = await dbRun(
      `INSERT INTO affiliate_clicks (user_id, offer_id, session_id, ip_address, user_agent, referrer)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, offer_id, trackingSessionId, ip_address, user_agent, referrer]
    );

    const clickId = (result as any).lastID;

    res.json({
      click_id: clickId,
      session_id: trackingSessionId,
      tracking_url: `${offer.affiliate_link}?ref=${trackingSessionId}&click_id=${clickId}`
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track conversion (called by webhook or manually)
router.post('/conversion', async (req, res) => {
  try {
    const { session_id, click_id, order_id, order_amount, commission_amount } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Find the click record
    const click = await dbGet(
      'SELECT * FROM affiliate_clicks WHERE session_id = ? OR id = ?',
      [session_id, click_id || 0]
    ) as any;

    if (!click) {
      return res.status(404).json({ error: 'Click record not found' });
    }

    // Check if conversion already exists
    const existingConversion = await dbGet(
      'SELECT * FROM conversions WHERE click_id = ? OR (session_id = ? AND order_id = ?)',
      [click.id, session_id, order_id || '']
    ) as any;

    if (existingConversion) {
      return res.json({
        message: 'Conversion already recorded',
        conversion: existingConversion
      });
    }

    // Get offer to calculate commission. Need both rate and flat-amount columns
    // so flat-bounty offers (Sucuri, GetResponse, etc.) award correctly.
    const offer = await dbGet(
      'SELECT cashback_rate, cashback_fixed_usd FROM offers WHERE id = ?',
      [click.offer_id]
    ) as { cashback_rate: number; cashback_fixed_usd: number | null } | undefined;

    // Calculate commission. Precedence:
    //   1. commission_amount in the request body (CJ webhook with exact amount)
    //   2. offer.cashback_fixed_usd if > 0 (flat-bounty offers)
    //   3. order_amount × cashback_rate / 100 (percentage offers)
    const fixedAmount = offer?.cashback_fixed_usd ?? 0;
    const isFlatRate = fixedAmount > 0;
    const commission = commission_amount
      || (isFlatRate ? fixedAmount
          : (order_amount && offer ? (order_amount * offer.cashback_rate / 100) : 0));

    // Tier credit: percentage offers count their purchase amount; flat-rate
    // bounties (no order_amount) count the full gross bounty.
    const tierSpend = isFlatRate ? commission : (order_amount || null);

    // Create conversion record
    const result = await dbRun(
      `INSERT INTO conversions (click_id, user_id, offer_id, session_id, order_id, order_amount, commission_amount, tier_spend_usd, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        click.id,
        click.user_id,
        click.offer_id,
        session_id,
        order_id || null,
        order_amount || null,
        commission,
        tierSpend,
        'pending'
      ]
    );

    const conversionId = (result as any).lastID;

    // Update click record
    await dbRun(
      'UPDATE affiliate_clicks SET converted = 1, conversion_id = ? WHERE id = ?',
      [conversionId, click.id]
    );

    // If user is logged in, create cashback transaction with the proper
    // platform/user split: platform takes a flat $5 fee on commissions > $5,
    // then the user gets their tier share of what's left. Flat-rate bounties
    // skip the tier share — the user keeps the whole remainder after the fee.
    // computePayout() is the single source of truth — see rewards-core.
    if (click.user_id && commission > 0) {
      const tierShare = await getUserCommissionShare(click.user_id);
      const { userAmount, platformAmount, platformFee } = computePayout(commission, tierShare, { flatRate: isFlatRate });

      const txResult = await dbRun(
        `INSERT INTO cashback_transactions
           (user_id, offer_id, amount, platform_amount, platform_fee_amount, user_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [click.user_id, click.offer_id, userAmount, platformAmount, platformFee, userAmount, 'pending']
      );
      const transactionId = (txResult as any).lastID;

      await dbRun(
        'UPDATE users SET total_earnings = total_earnings + ? WHERE id = ?',
        [userAmount, click.user_id]
      );

      // Create referral earning if user was referred (async). Referrer bonus is
      // computed from the user's cashback, not the full commission.
      createReferralEarning(click.user_id, transactionId, userAmount).catch(err => {
        console.error('Error creating referral earning:', err);
      });
    }

    res.status(201).json({
      message: 'Conversion recorded successfully',
      conversion_id: conversionId
    });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get click analytics (for authenticated users)
router.get('/analytics/clicks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clicks = await dbAll(`
      SELECT 
        ac.*,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name,
        CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as converted
      FROM affiliate_clicks ac
      JOIN offers o ON ac.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      LEFT JOIN conversions c ON ac.id = c.click_id
      WHERE ac.user_id = ?
      ORDER BY ac.clicked_at DESC
      LIMIT 100
    `, [req.userId]);

    res.json(clicks);
  } catch (error) {
    console.error('Error fetching click analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversion analytics (for authenticated users)
router.get('/analytics/conversions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const conversions = await dbAll(`
      SELECT 
        c.*,
        o.title as offer_title,
        o.cashback_rate,
        m.name as merchant_name
      FROM conversions c
      JOIN offers o ON c.offer_id = o.id
      JOIN merchants m ON o.merchant_id = m.id
      WHERE c.user_id = ?
      ORDER BY c.conversion_date DESC
      LIMIT 100
    `, [req.userId]);

    res.json(conversions);
  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
