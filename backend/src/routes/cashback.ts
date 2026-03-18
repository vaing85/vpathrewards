import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateCashbackTrack } from '../middleware/validation';
import * as cashbackService from '../services/cashbackService';

const router = express.Router();

router.get('/transactions', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await cashbackService.getTransactions(req.userId!, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const summary = await cashbackService.getSummary(req.userId!);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const group_by = (req.query.group_by as string) || 'day';
    const daysRaw = req.query.days;
    const days = typeof daysRaw === 'number' ? daysRaw : (typeof daysRaw === 'string' ? parseInt(daysRaw, 10) : NaN);
    const daysNum = Number.isFinite(days) ? days : 30;
    const status = req.query.status as string | undefined;
    const result = await cashbackService.getHistory(req.userId!, { group_by, days: daysNum, status });
    res.json(result);
  } catch (error) {
    console.error('Error fetching cashback history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/calendar', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const result = await cashbackService.getCalendar(req.userId!, year, month);
    res.json(result);
  } catch (error) {
    console.error('Error fetching cashback calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/goals', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const goals = await cashbackService.getGoals(req.userId!);
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/goals', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { title, target_amount, period_type, start_date, end_date } = req.body;
    if (!title || !target_amount) {
      return res.status(400).json({ error: 'Title and target amount are required' });
    }
    const goal = await cashbackService.createGoal(req.userId!, {
      title,
      target_amount,
      period_type: period_type || 'monthly',
      start_date: start_date || null,
      end_date: end_date || null
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/goals/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const { title, target_amount, period_type, start_date, end_date } = req.body;
    const updated = await cashbackService.updateGoal(req.userId!, id, {
      title,
      target_amount,
      period_type,
      start_date,
      end_date
    });
    if (!updated) return res.status(404).json({ error: 'Goal not found' });
    res.json(updated);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/goals/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const deleted = await cashbackService.deleteGoal(req.userId!, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/track', authenticateToken, validateCashbackTrack, async (req: AuthRequest, res: express.Response) => {
  try {
    const { offer_id, amount } = req.body;
    if (!offer_id || !amount) {
      return res.status(400).json({ error: 'Offer ID and amount are required' });
    }
    const result = await cashbackService.trackCashback(req.userId!, offer_id, parseFloat(amount));
    if (!result) return res.status(404).json({ error: 'Offer not found' });
    res.status(201).json({
      message: 'Cashback tracked successfully',
      cashback_amount: result.cashbackAmount
    });
  } catch (error) {
    console.error('Error tracking cashback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
