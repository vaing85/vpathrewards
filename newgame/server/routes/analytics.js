const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

/**
 * Get revenue trends (daily, weekly, monthly)
 * Query params: period (daily, weekly, monthly), startDate, endDate
 */
router.get('/revenue', adminAuth, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let groupFormat = {};
    let dateFormat = '';

    if (period === 'daily') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      dateFormat = '%Y-%m-%d';
    } else if (period === 'weekly') {
      groupFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      dateFormat = '%Y-W%U';
    } else if (period === 'monthly') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      dateFormat = '%Y-%m';
    }

    // Get bets and wins by period
    const bets = await Transaction.aggregate([
      {
        $match: {
          type: 'bet',
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    const wins = await Transaction.aggregate([
      {
        $match: {
          type: 'win',
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: groupFormat,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    // Combine and format data
    const revenueData = [];
    const betMap = {};
    const winMap = {};

    bets.forEach(item => {
      const key = period === 'daily' 
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
        : period === 'weekly'
        ? `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
        : `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      betMap[key] = item.total;
    });

    wins.forEach(item => {
      const key = period === 'daily' 
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
        : period === 'weekly'
        ? `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
        : `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      winMap[key] = item.total;
    });

    // Get all unique dates
    const allDates = new Set([...Object.keys(betMap), ...Object.keys(winMap)]);
    allDates.forEach(date => {
      revenueData.push({
        date,
        bets: betMap[date] || 0,
        wins: winMap[date] || 0,
        revenue: (betMap[date] || 0) - (winMap[date] || 0)
      });
    });

    revenueData.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ revenueData, period });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get game popularity metrics
 * Query params: startDate, endDate, limit
 */
router.get('/game-popularity', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get game statistics
    const gameStats = await Transaction.aggregate([
      {
        $match: {
          type: 'bet',
          status: 'completed',
          game: { $exists: true, $ne: null },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$game',
          totalBets: { $sum: '$amount' },
          betCount: { $sum: 1 },
          uniquePlayers: { $addToSet: '$user' }
        }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { gameName: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$game', '$$gameName'] },
                    { $eq: ['$type', 'win'] },
                    { $eq: ['$status', 'completed'] },
                    ...(dateFilter.createdAt ? [
                      { $gte: ['$createdAt', dateFilter.createdAt.$gte] },
                      { $lte: ['$createdAt', dateFilter.createdAt.$lte] }
                    ] : [])
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalWins: { $sum: '$amount' }
              }
            }
          ],
          as: 'wins'
        }
      },
      {
        $project: {
          game: '$_id',
          totalBets: 1,
          betCount: 1,
          totalWins: { $ifNull: [{ $arrayElemAt: ['$wins.totalWins', 0] }, 0] },
          uniquePlayers: { $size: '$uniquePlayers' },
          revenue: {
            $subtract: [
              '$totalBets',
              { $ifNull: [{ $arrayElemAt: ['$wins.totalWins', 0] }, 0] }
            ]
          }
        }
      },
      {
        $sort: { totalBets: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({ gameStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get user activity metrics
 * Query params: period (daily, weekly, monthly), startDate, endDate
 */
router.get('/user-activity', adminAuth, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let groupFormat = {};
    if (period === 'daily') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
    } else if (period === 'weekly') {
      groupFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
    } else if (period === 'monthly') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
    }

    // Get user registrations
    const registrations = await User.aggregate([
      {
        $match: {
          role: 'player',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    // Get active users (users who made at least one bet)
    const activeUsers = await Transaction.aggregate([
      {
        $match: {
          type: 'bet',
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            ...groupFormat,
            user: '$user'
          }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
            week: '$_id.week'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
      }
    ]);

    // Format data
    const activityData = [];
    const regMap = {};
    const activeMap = {};

    registrations.forEach(item => {
      const key = period === 'daily' 
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
        : period === 'weekly'
        ? `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
        : `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      regMap[key] = item.count;
    });

    activeUsers.forEach(item => {
      const key = period === 'daily' 
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
        : period === 'weekly'
        ? `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`
        : `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      activeMap[key] = item.count;
    });

    const allDates = new Set([...Object.keys(regMap), ...Object.keys(activeMap)]);
    allDates.forEach(date => {
      activityData.push({
        date,
        registrations: regMap[date] || 0,
        activeUsers: activeMap[date] || 0
      });
    });

    activityData.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ activityData, period });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get financial summary
 * Query params: startDate, endDate
 */
router.get('/financial-summary', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      deposits,
      withdrawals,
      bets,
      wins,
      bonuses
    ] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'withdrawal', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'bet', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'win', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'bonus', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalDeposits = deposits[0]?.total || 0;
    const totalWithdrawals = withdrawals[0]?.total || 0;
    const totalBets = bets[0]?.total || 0;
    const totalWins = wins[0]?.total || 0;
    const totalBonuses = bonuses[0]?.total || 0;
    const netRevenue = totalBets - totalWins;
    const grossProfit = netRevenue - totalBonuses;

    res.json({
      deposits: {
        total: totalDeposits,
        count: deposits[0]?.count || 0
      },
      withdrawals: {
        total: totalWithdrawals,
        count: withdrawals[0]?.count || 0
      },
      bets: {
        total: totalBets,
        count: bets[0]?.count || 0
      },
      wins: {
        total: totalWins,
        count: wins[0]?.count || 0
      },
      bonuses: {
        total: totalBonuses,
        count: bonuses[0]?.count || 0
      },
      netRevenue,
      grossProfit,
      profitMargin: totalBets > 0 ? ((netRevenue / totalBets) * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

