const express = require('express');
const Bonus = require('../models/Bonus');
const Promotion = require('../models/Promotion');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const router = express.Router();

/**
 * Helper function to apply a bonus to user balance
 */
async function applyBonus(userId, bonusAmount, bonusType, description, metadata = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const balanceBefore = user.balance;
  user.balance += bonusAmount;
  const balanceAfter = user.balance;
  await user.save();

  // Create transaction record
  const transaction = new Transaction({
    user: userId,
    type: 'bonus',
    amount: bonusAmount,
    balanceBefore,
    balanceAfter,
    status: 'completed',
    description,
    metadata: { ...metadata, bonusType }
  });
  await transaction.save();

  return { transaction, balance: user.balance };
}

/**
 * Get user's bonus history
 */
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const userId = req.user._id;

    const bonuses = await Bonus.find({ user: userId })
      .populate('promotion', 'name description')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Bonus.countDocuments({ user: userId });

    res.json({
      bonuses,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Claim daily login bonus
 */
router.post('/daily-login', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already claimed today's bonus
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (user.lastDailyLoginBonus) {
      const lastBonusDate = new Date(user.lastDailyLoginBonus);
      const lastBonusDay = new Date(lastBonusDate.getFullYear(), lastBonusDate.getMonth(), lastBonusDate.getDate());
      
      if (lastBonusDay.getTime() === today.getTime()) {
        return res.status(400).json({ message: 'Daily login bonus already claimed today' });
      }
    }

    // Find active daily login promotion
    const promotion = await Promotion.findOne({
      type: 'daily_login',
      active: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ createdAt: -1 });

    let bonusAmount = 5; // Default daily bonus
    let promotionId = null;

    if (promotion) {
      // Check if promotion has reached max uses
      if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
        // Use default bonus
      } else {
        // Calculate bonus based on promotion
        if (promotion.bonusType === 'fixed') {
          bonusAmount = promotion.bonusValue;
        } else {
          bonusAmount = promotion.bonusValue; // For daily login, percentage doesn't make sense, so treat as fixed
        }

        // Check max bonus cap
        if (promotion.maxBonus && bonusAmount > promotion.maxBonus) {
          bonusAmount = promotion.maxBonus;
        }

        promotionId = promotion._id;
        promotion.currentUses += 1;
        await promotion.save();
      }
    }

    // Apply bonus
    const { transaction, balance } = await applyBonus(
      userId,
      bonusAmount,
      'daily_login',
      `Daily login bonus: $${bonusAmount.toFixed(2)}`,
      { promotionId }
    );

    // Create bonus record
    const bonus = new Bonus({
      user: userId,
      type: 'daily_login',
      amount: bonusAmount,
      status: 'active',
      promotion: promotionId,
      metadata: { transactionId: transaction._id }
    });
    await bonus.save();

    // Update user's last daily login bonus date
    user.lastDailyLoginBonus = now;
    await user.save();

    // Create notification
    try {
      await createNotification(
        userId,
        'bonus',
        '🎁 Daily Login Bonus',
        `You received a $${bonusAmount.toFixed(2)} daily login bonus!`,
        { bonusId: bonus._id, amount: bonusAmount }
      );
    } catch (error) {
      console.error('Error creating bonus notification:', error);
    }

    res.json({
      message: 'Daily login bonus claimed successfully',
      bonus: {
        amount: bonusAmount,
        balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Check if daily login bonus is available
 */
router.get('/daily-login/status', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let canClaim = true;
    if (user.lastDailyLoginBonus) {
      const lastBonusDate = new Date(user.lastDailyLoginBonus);
      const lastBonusDay = new Date(lastBonusDate.getFullYear(), lastBonusDate.getMonth(), lastBonusDate.getDate());
      canClaim = lastBonusDay.getTime() !== today.getTime();
    }

    // Get active daily login promotion
    const promotion = await Promotion.findOne({
      type: 'daily_login',
      active: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ createdAt: -1 });

    let bonusAmount = 5; // Default
    if (promotion && (!promotion.maxUses || promotion.currentUses < promotion.maxUses)) {
      if (promotion.bonusType === 'fixed') {
        bonusAmount = promotion.bonusValue;
      } else {
        bonusAmount = promotion.bonusValue;
      }
      if (promotion.maxBonus && bonusAmount > promotion.maxBonus) {
        bonusAmount = promotion.maxBonus;
      }
    }

    res.json({
      canClaim,
      bonusAmount,
      lastClaimDate: user.lastDailyLoginBonus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Apply deposit bonus (called from deposit route)
 */
router.post('/deposit', auth, async (req, res) => {
  try {
    const { depositAmount, transactionId } = req.body;
    const userId = req.user._id;

    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    // Find active deposit promotion
    const now = new Date();
    const promotion = await Promotion.findOne({
      type: 'deposit',
      active: true,
      minDeposit: { $lte: depositAmount },
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ createdAt: -1 });

    if (!promotion) {
      return res.json({ message: 'No active deposit promotion', bonus: null });
    }

    // Check if user has already used this promotion max times
    const userBonusCount = await Bonus.countDocuments({
      user: userId,
      promotion: promotion._id,
      type: 'deposit'
    });

    if (userBonusCount >= promotion.maxUsesPerUser) {
      return res.json({ message: 'Promotion usage limit reached', bonus: null });
    }

    // Check if promotion has reached max uses
    if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
      return res.json({ message: 'Promotion has reached maximum uses', bonus: null });
    }

    // Calculate bonus
    let bonusAmount = 0;
    if (promotion.bonusType === 'percentage') {
      bonusAmount = depositAmount * (promotion.bonusValue / 100);
      if (promotion.maxBonus && bonusAmount > promotion.maxBonus) {
        bonusAmount = promotion.maxBonus;
      }
    } else {
      bonusAmount = promotion.bonusValue;
    }

    if (bonusAmount <= 0) {
      return res.json({ message: 'Invalid bonus amount', bonus: null });
    }

    // Apply bonus
    const { transaction, balance } = await applyBonus(
      userId,
      bonusAmount,
      'deposit',
      `Deposit bonus: $${bonusAmount.toFixed(2)} (${promotion.name})`,
      { promotionId: promotion._id, depositAmount, originalTransactionId: transactionId }
    );

    // Create bonus record
    const bonus = new Bonus({
      user: userId,
      type: 'deposit',
      amount: bonusAmount,
      status: 'active',
      promotion: promotion._id,
      metadata: { transactionId: transaction._id, depositAmount }
    });
    await bonus.save();

    // Update promotion usage
    promotion.currentUses += 1;
    await promotion.save();

    // Create notification
    try {
      await createNotification(
        userId,
        'bonus',
        '🎁 Deposit Bonus',
        `You received a $${bonusAmount.toFixed(2)} deposit bonus!`,
        { bonusId: bonus._id, amount: bonusAmount, promotionName: promotion.name }
      );
    } catch (error) {
      console.error('Error creating bonus notification:', error);
    }

    res.json({
      message: 'Deposit bonus applied successfully',
      bonus: {
        amount: bonusAmount,
        balance,
        promotionName: promotion.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

