const express = require('express');
const Promotion = require('../models/Promotion');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * Get all promotions
 */
router.get('/promotions', adminAuth, async (req, res) => {
  try {
    const { active, type } = req.query;
    const query = {};
    
    if (active !== undefined) {
      query.active = active === 'true';
    }
    if (type) {
      query.type = type;
    }

    const promotions = await Promotion.find(query)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ promotions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get active promotions (public endpoint for players)
 */
router.get('/promotions/active', async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      active: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ],
      $or: [
        { maxUses: null },
        { currentUses: { $lt: '$maxUses' } }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

    res.json({ promotions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Create a new promotion
 */
router.post('/promotions', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      bonusType,
      bonusValue,
      minDeposit,
      maxBonus,
      startDate,
      endDate,
      maxUses,
      maxUsesPerUser
    } = req.body;

    // Validate required fields
    if (!name || !description || !type || !bonusType || bonusValue === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate bonus value
    if (bonusValue < 0) {
      return res.status(400).json({ message: 'Bonus value must be positive' });
    }

    // Validate dates
    if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const promotion = new Promotion({
      name,
      description,
      type,
      bonusType,
      bonusValue,
      minDeposit: minDeposit || 0,
      maxBonus: maxBonus || null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || 1,
      createdBy: req.user._id,
      active: true
    });

    await promotion.save();

    res.status(201).json({
      message: 'Promotion created successfully',
      promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Update a promotion
 */
router.put('/promotions/:id', adminAuth, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const {
      name,
      description,
      type,
      bonusType,
      bonusValue,
      minDeposit,
      maxBonus,
      startDate,
      endDate,
      maxUses,
      maxUsesPerUser,
      active
    } = req.body;

    if (name) promotion.name = name;
    if (description) promotion.description = description;
    if (type) promotion.type = type;
    if (bonusType) promotion.bonusType = bonusType;
    if (bonusValue !== undefined) promotion.bonusValue = bonusValue;
    if (minDeposit !== undefined) promotion.minDeposit = minDeposit;
    if (maxBonus !== undefined) promotion.maxBonus = maxBonus;
    if (startDate) promotion.startDate = new Date(startDate);
    if (endDate !== undefined) promotion.endDate = endDate ? new Date(endDate) : null;
    if (maxUses !== undefined) promotion.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) promotion.maxUsesPerUser = maxUsesPerUser;
    if (active !== undefined) promotion.active = active;

    // Validate dates
    if (promotion.endDate && promotion.startDate && promotion.endDate <= promotion.startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    await promotion.save();

    res.json({
      message: 'Promotion updated successfully',
      promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Delete a promotion
 */
router.delete('/promotions/:id', adminAuth, async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Toggle promotion active status
 */
router.put('/promotions/:id/toggle', adminAuth, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.active = !promotion.active;
    await promotion.save();

    res.json({
      message: `Promotion ${promotion.active ? 'activated' : 'deactivated'}`,
      promotion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

