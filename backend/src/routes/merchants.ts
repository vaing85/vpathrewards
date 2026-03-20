import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateMerchantReview } from '../middleware/validation';
import * as merchantService from '../services/merchantService';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const minCashback = req.query.minCashback != null ? parseFloat(req.query.minCashback as string) : undefined;
    const sort = (req.query.sort as string) || 'name';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await merchantService.listMerchants({
      search,
      category,
      minCashback,
      sort,
      page,
      limit
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const merchant = await merchantService.getMerchantById(req.params.id);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    res.json(merchant);
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const result = await merchantService.getReviews(req.params.id);
    if (!result) return res.status(404).json({ error: 'Merchant not found' });
    res.json(result);
  } catch (error) {
    console.error('Error fetching merchant reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reviews', authenticateToken, validateMerchantReview, async (req: AuthRequest, res: express.Response) => {
  try {
    const merchantId = parseInt(req.params.id, 10);
    const { rating, comment: commentBody } = req.body;
    const comment = commentBody != null ? String(commentBody).trim() : null;
    const updated = await merchantService.upsertReview(merchantId, req.userId!, rating, comment || null);
    if (!updated) return res.status(404).json({ error: 'Merchant not found' });
    res.status(201).json(updated);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/offers', async (req, res) => {
  try {
    const offers = await merchantService.getOffersForMerchant(req.params.id);
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/banners', async (req, res) => {
  try {
    const { dbAll } = await import('../database');
    const banners = await dbAll(
      'SELECT * FROM merchant_banners WHERE merchant_id = $1 AND is_active = 1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
