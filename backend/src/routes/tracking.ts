import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as trackingService from '../services/trackingService';
import { appConfig } from '../config/appConfig';

const router = express.Router();

router.get('/referral-code', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const referralCode = await trackingService.getOrCreateReferralCode(req.userId!);
    const referralLink = `${appConfig.frontendUrl}/ref/${referralCode}`;
    res.json({ referral_code: referralCode, referral_link: referralLink });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/click', async (req, res) => {
  try {
    const { offer_id, session_id, referral_code } = req.body;
    if (!offer_id) {
      return res.status(400).json({ error: 'Offer ID is required' });
    }
    const ip_address = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const user_agent = (req.headers['user-agent'] as string) || 'unknown';
    const referrer = (req.headers['referer'] as string) || 'direct';
    const result = await trackingService.trackClick({
      offer_id,
      session_id,
      referral_code,
      ip_address,
      user_agent,
      referrer
    });
    if (!result) return res.status(404).json({ error: 'Offer not found' });
    res.json(result);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversion', async (req, res) => {
  try {
    const { session_id, click_id, order_id, order_amount, commission_amount } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    const result = await trackingService.recordConversion({
      session_id,
      click_id,
      order_id,
      order_amount,
      commission_amount
    });
    if (!result) return res.status(404).json({ error: 'Click record not found' });
    if (result.existing) {
      return res.json({ message: 'Conversion already recorded', conversion: result.conversion });
    }
    res.status(201).json({ message: 'Conversion recorded successfully', conversion_id: result.conversion_id });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics/clicks', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clicks = await trackingService.getClickAnalytics(req.userId!);
    res.json(clicks);
  } catch (error) {
    console.error('Error fetching click analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics/conversions', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const conversions = await trackingService.getConversionAnalytics(req.userId!);
    res.json(conversions);
  } catch (error) {
    console.error('Error fetching conversion analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
