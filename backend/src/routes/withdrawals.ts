import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateWithdrawal } from '../middleware/validation';
import { passwordLimiter } from '../middleware/rateLimiter';
import * as payoutService from '../services/payoutService';

const router = express.Router();

router.get('/history', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const withdrawals = await payoutService.getWithdrawalHistory(req.userId!);
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/balance/available', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const balance = await payoutService.getAvailableBalance(req.userId!);
    res.json(balance);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response) => {
  try {
    const withdrawal = await payoutService.getWithdrawalById(req.userId!, req.params.id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    res.json(withdrawal);
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/request', authenticateToken, passwordLimiter, validateWithdrawal, async (req: AuthRequest, res: express.Response) => {
  try {
    const { amount, payment_method, payment_details } = req.body;
    if (!amount || !payment_method || !payment_details) {
      return res.status(400).json({ error: 'Amount, payment method, and payment details are required' });
    }
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < payoutService.MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({
        error: `Minimum withdrawal amount is $${payoutService.MIN_WITHDRAWAL_AMOUNT}`
      });
    }
    const result = await payoutService.createWithdrawalRequest(req.userId!, {
      amount: withdrawalAmount,
      payment_method,
      payment_details
    });
    if (!result) return res.status(404).json({ error: 'User not found' });
    if ('error' in result) {
      if (result.error === 'insufficient_balance') {
        return res.status(400).json({ error: 'Insufficient balance. You have pending withdrawals or insufficient earnings.' });
      }
      if (result.error === 'below_minimum') {
        return res.status(400).json({ error: `Minimum withdrawal amount is $${payoutService.MIN_WITHDRAWAL_AMOUNT}` });
      }
    }
    res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: result.withdrawal
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
