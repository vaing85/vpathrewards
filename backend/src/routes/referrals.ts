import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { appConfig } from '../config/appConfig';
import * as referralService from '../services/referralService';

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const data = await referralService.getDashboard(req.userId!);
    res.json(data);
  } catch (error) {
    console.error('Error fetching referral dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/earnings', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const earnings = await referralService.getEarnings(req.userId!);
    res.json(earnings);
  } catch (error) {
    console.error('Error fetching referral earnings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const data = await referralService.getLeaderboard(req.userId!, limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching referral leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/code', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const data = await referralService.getCode(req.userId!);
    if (!data) return res.status(404).json({ error: 'Referral code not found' });
    res.json({
      referral_code: data.referral_code,
      referral_link: `${appConfig.frontendUrl}/register?ref=${data.referral_code}`,
      total_referrals: data.total_referrals,
      total_earnings: data.total_earnings,
    });
  } catch (error) {
    console.error('Error fetching referral code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
