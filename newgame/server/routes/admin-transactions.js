const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// Get all transactions with filters
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { 
      userId, 
      type, 
      status, 
      startDate, 
      endDate, 
      limit = 100, 
      page = 1 
    } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'username email')
      .populate('processedBy', 'username')
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

// Approve withdrawal
router.put('/transactions/:id/approve', adminAuth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ message: 'Only withdrawals can be approved' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    const user = transaction.user;
    const balanceBefore = user.balance;

    if (balanceBefore < transaction.amount) {
      transaction.status = 'failed';
      transaction.description += ' - Insufficient balance at approval time';
      await transaction.save();
      return res.status(400).json({ message: 'User has insufficient balance' });
    }

    // Update user balance
    user.balance = balanceBefore - transaction.amount;
    await user.save();

    // Update transaction
    transaction.status = 'completed';
    transaction.balanceAfter = user.balance;
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    transaction.description += ' - Approved by admin';
    await transaction.save();

    // Create notification for user
    try {
      await createNotification(
        user._id,
        'withdrawal_approved',
        '✅ Withdrawal Approved',
        `Your withdrawal of $${transaction.amount.toFixed(2)} has been approved and processed.`,
        {
          transactionId: transaction._id,
          amount: transaction.amount
        }
      );
    } catch (error) {
      console.error('Error creating withdrawal approval notification:', error);
    }

    res.json({
      message: 'Withdrawal approved successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject withdrawal
router.put('/transactions/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdrawal') {
      return res.status(400).json({ message: 'Only withdrawals can be rejected' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    transaction.status = 'cancelled';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    transaction.description += ` - Rejected by admin${reason ? ': ' + reason : ''}`;
    await transaction.save();

    // Create notification for user
    try {
      const user = await User.findById(transaction.user);
      if (user) {
        await createNotification(
          user._id,
          'withdrawal_rejected',
          '❌ Withdrawal Rejected',
          `Your withdrawal request of $${transaction.amount.toFixed(2)} has been rejected.${reason ? ' Reason: ' + reason : ''}`,
          {
            transactionId: transaction._id,
            amount: transaction.amount,
            reason: reason || 'No reason provided'
          }
        );
      }
    } catch (error) {
      console.error('Error creating withdrawal rejection notification:', error);
    }

    res.json({
      message: 'Withdrawal rejected',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get transaction statistics
router.get('/transactions/stats', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [
      totalDeposits,
      totalWithdrawals,
      totalBets,
      totalWins,
      pendingWithdrawals,
      completedTransactions
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...query, type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { ...query, type: 'withdrawal', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { ...query, type: 'bet', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { ...query, type: 'win', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
      Transaction.countDocuments({ ...query, status: 'completed' })
    ]);

    res.json({
      totalDeposits: totalDeposits[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      totalBets: totalBets[0]?.total || 0,
      totalWins: totalWins[0]?.total || 0,
      netRevenue: (totalBets[0]?.total || 0) - (totalWins[0]?.total || 0),
      pendingWithdrawals,
      completedTransactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

