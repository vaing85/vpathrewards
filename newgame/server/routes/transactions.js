const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Bonus = require('../models/Bonus');
const Promotion = require('../models/Promotion');
const { auth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// Helper function to create a transaction
async function createTransaction(userId, type, amount, game = null, description = '', metadata = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const balanceBefore = user.balance;
  let balanceAfter = balanceBefore;
  let status = 'completed';

  // Update balance based on transaction type
  if (type === 'deposit' || type === 'win' || type === 'bonus' || type === 'refund') {
    balanceAfter = balanceBefore + amount;
    user.balance = balanceAfter;
  } else if (type === 'withdrawal' || type === 'bet') {
    if (type === 'withdrawal' && balanceBefore < amount) {
      status = 'failed';
    } else {
      balanceAfter = balanceBefore - amount;
      user.balance = balanceAfter;
    }
  }

  // Only update user balance if transaction is successful
  if (status === 'completed') {
    await user.save();
  }

  // Create transaction record
  const transaction = new Transaction({
    user: userId,
    type,
    amount,
    balanceBefore,
    balanceAfter: status === 'completed' ? balanceAfter : balanceBefore,
    status,
    game,
    description,
    metadata
  });

  await transaction.save();
  return { transaction, balance: user.balance };
}

// Get user's transaction history
router.get('/history', auth, async (req, res) => {
  try {
    const { type, status, limit = 50, page = 1 } = req.query;
    const query = { user: req.user._id };

    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create deposit
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    if (amount < 5) {
      return res.status(400).json({ message: 'Minimum deposit amount is $5' });
    }

    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum deposit amount is $10,000' });
    }

    const { transaction, balance } = await createTransaction(
      req.user._id,
      'deposit',
      amount,
      null,
      `Deposit of $${amount.toFixed(2)}`
    );

    // Try to apply deposit bonus
    try {
      const now = new Date();
      const promotion = await Promotion.findOne({
        type: 'deposit',
        active: true,
        minDeposit: { $lte: amount },
        startDate: { $lte: now },
        $or: [
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      }).sort({ createdAt: -1 });

      if (promotion) {
        // Check if user has already used this promotion max times
        const userBonusCount = await Bonus.countDocuments({
          user: req.user._id,
          promotion: promotion._id,
          type: 'deposit'
        });

        if (userBonusCount < promotion.maxUsesPerUser) {
          // Check if promotion has reached max uses
          if (!promotion.maxUses || promotion.currentUses < promotion.maxUses) {
            // Calculate bonus
            let bonusAmount = 0;
            if (promotion.bonusType === 'percentage') {
              bonusAmount = amount * (promotion.bonusValue / 100);
              if (promotion.maxBonus && bonusAmount > promotion.maxBonus) {
                bonusAmount = promotion.maxBonus;
              }
            } else {
              bonusAmount = promotion.bonusValue;
            }

            if (bonusAmount > 0) {
              const user = await User.findById(req.user._id);
              const balanceBefore = user.balance;
              user.balance += bonusAmount;
              await user.save();

              // Create bonus transaction
              const bonusTransaction = new Transaction({
                user: req.user._id,
                type: 'bonus',
                amount: bonusAmount,
                balanceBefore,
                balanceAfter: user.balance,
                status: 'completed',
                description: `Deposit bonus: $${bonusAmount.toFixed(2)} (${promotion.name})`,
                metadata: { promotionId: promotion._id, bonusType: 'deposit', depositAmount: amount, originalTransactionId: transaction._id }
              });
              await bonusTransaction.save();

              // Create bonus record
              const bonus = new Bonus({
                user: req.user._id,
                type: 'deposit',
                amount: bonusAmount,
                status: 'active',
                promotion: promotion._id,
                metadata: { transactionId: bonusTransaction._id, depositAmount: amount }
              });
              await bonus.save();

              // Update promotion usage
              promotion.currentUses += 1;
              await promotion.save();

              // Create notification
              try {
                await createNotification(
                  req.user._id,
                  'bonus',
                  '🎁 Deposit Bonus',
                  `You received a $${bonusAmount.toFixed(2)} deposit bonus!`,
                  { bonusId: bonus._id, amount: bonusAmount, promotionName: promotion.name }
                );
              } catch (error) {
                console.error('Error creating bonus notification:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error applying deposit bonus:', error);
      // Don't fail deposit if bonus fails
    }

    res.json({
      message: 'Deposit successful',
      transaction,
      balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create withdrawal request
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user._id);

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    if (amount > user.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (amount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is $10' });
    }

    if (amount > 5000) {
      return res.status(400).json({ message: 'Maximum withdrawal amount is $5,000' });
    }

    // Create pending withdrawal
    const balanceBefore = user.balance;
    const transaction = new Transaction({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      balanceBefore,
      balanceAfter: balanceBefore, // Balance doesn't change until approved
      status: 'pending',
      description: `Withdrawal request of $${amount.toFixed(2)}`
    });

    await transaction.save();

    res.json({
      message: 'Withdrawal request submitted. Pending admin approval.',
      transaction,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transaction by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user owns this transaction or is admin
    if (transaction.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

