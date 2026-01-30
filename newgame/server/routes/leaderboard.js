const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

/**
 * Get leaderboard data
 * Query params:
 * - category: 'winnings' | 'biggestWin' | 'mostActive' | 'totalBets'
 * - period: 'daily' | 'weekly' | 'alltime'
 * - limit: number of results (default: 50)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { category = 'winnings', period = 'alltime', limit = 50 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 results

    // Calculate date range based on period
    let dateFilter = {};
    if (period === 'daily') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (period === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      dateFilter = { createdAt: { $gte: startOfWeek } };
    }

    let leaderboard = [];

    if (category === 'winnings') {
      // Total winnings leaderboard
      if (period === 'alltime') {
        // Use User model's totalWinnings field
        leaderboard = await User.find({ role: 'player' })
          .select('username email totalWinnings totalBets balance')
          .sort({ totalWinnings: -1 })
          .limit(limitNum)
          .lean();
      } else {
        // Aggregate from transactions for time period
        const winTransactions = await Transaction.aggregate([
          {
            $match: {
              type: 'win',
              status: 'completed',
              ...dateFilter
            }
          },
          {
            $group: {
              _id: '$user',
              totalWinnings: { $sum: '$amount' }
            }
          },
          {
            $sort: { totalWinnings: -1 }
          },
          {
            $limit: limitNum
          }
        ]);

        // Get user details
        const userIds = winTransactions.map(t => t._id);
        const users = await User.find({ _id: { $in: userIds }, role: 'player' })
          .select('username email totalWinnings totalBets balance')
          .lean();

        // Merge transaction data with user data
        const userMap = {};
        users.forEach(u => {
          userMap[u._id.toString()] = u;
        });

        leaderboard = winTransactions.map(t => ({
          ...userMap[t._id.toString()],
          totalWinnings: t.totalWinnings
        })).filter(u => u.username); // Filter out any missing users
      }

      // Format response
      leaderboard = leaderboard.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        email: user.email,
        value: user.totalWinnings || 0,
        totalBets: user.totalBets || 0,
        balance: user.balance || 0
      }));

    } else if (category === 'biggestWin') {
      // Biggest single win leaderboard
      const winTransactions = await Transaction.aggregate([
        {
          $match: {
            type: 'win',
            status: 'completed',
            ...dateFilter
          }
        },
        {
          $sort: { amount: -1 }
        },
        {
          $group: {
            _id: '$user',
            biggestWin: { $max: '$amount' },
            game: { $first: '$game' },
            winDate: { $first: '$createdAt' }
          }
        },
        {
          $sort: { biggestWin: -1 }
        },
        {
          $limit: limitNum
        }
      ]);

      const userIds = winTransactions.map(t => t._id);
      const users = await User.find({ _id: { $in: userIds }, role: 'player' })
        .select('username email totalWinnings totalBets balance')
        .lean();

      const userMap = {};
      users.forEach(u => {
        userMap[u._id.toString()] = u;
      });

      leaderboard = winTransactions.map((t, index) => ({
        rank: index + 1,
        username: userMap[t._id.toString()]?.username || 'Unknown',
        email: userMap[t._id.toString()]?.email || '',
        value: t.biggestWin || 0,
        game: t.game || 'Unknown',
        winDate: t.winDate,
        totalBets: userMap[t._id.toString()]?.totalBets || 0,
        balance: userMap[t._id.toString()]?.balance || 0
      })).filter(u => u.username !== 'Unknown');

    } else if (category === 'mostActive') {
      // Most active players (most games played)
      if (period === 'alltime') {
        // Count total games from User model using aggregation for better performance
        // Convert gamesPlayed object to array and sum all values
        const users = await User.aggregate([
          {
            $match: { role: 'player' }
          },
          {
            $project: {
              username: 1,
              email: 1,
              totalWinnings: 1,
              totalBets: 1,
              balance: 1,
              gamesPlayed: 1,
              totalGames: {
                $reduce: {
                  input: { $objectToArray: { $ifNull: ['$gamesPlayed', {}] } },
                  initialValue: 0,
                  in: { $add: ['$$value', { $ifNull: ['$$this.v', 0] }] }
                }
              }
            }
          },
          {
            $match: { totalGames: { $gt: 0 } }
          },
          {
            $sort: { totalGames: -1 }
          },
          {
            $limit: limitNum
          }
        ]);

        leaderboard = users;
      } else {
        // Count bet transactions for time period
        const betTransactions = await Transaction.aggregate([
          {
            $match: {
              type: 'bet',
              status: 'completed',
              ...dateFilter
            }
          },
          {
            $group: {
              _id: '$user',
              totalGames: { $sum: 1 }
            }
          },
          {
            $sort: { totalGames: -1 }
          },
          {
            $limit: limitNum
          }
        ]);

        const userIds = betTransactions.map(t => t._id);
        const users = await User.find({ _id: { $in: userIds }, role: 'player' })
          .select('username email totalWinnings totalBets balance')
          .lean();

        const userMap = {};
        users.forEach(u => {
          userMap[u._id.toString()] = u;
        });

        leaderboard = betTransactions.map(t => ({
          ...userMap[t._id.toString()],
          totalGames: t.totalGames
        })).filter(u => u.username);
      }

      // Format response
      leaderboard = leaderboard.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        email: user.email,
        value: user.totalGames || 0,
        totalBets: user.totalBets || 0,
        balance: user.balance || 0
      }));

    } else if (category === 'totalBets') {
      // Total bets leaderboard
      if (period === 'alltime') {
        leaderboard = await User.find({ role: 'player' })
          .select('username email totalWinnings totalBets balance')
          .sort({ totalBets: -1 })
          .limit(limitNum)
          .lean();
      } else {
        const betTransactions = await Transaction.aggregate([
          {
            $match: {
              type: 'bet',
              status: 'completed',
              ...dateFilter
            }
          },
          {
            $group: {
              _id: '$user',
              totalBets: { $sum: '$amount' }
            }
          },
          {
            $sort: { totalBets: -1 }
          },
          {
            $limit: limitNum
          }
        ]);

        const userIds = betTransactions.map(t => t._id);
        const users = await User.find({ _id: { $in: userIds }, role: 'player' })
          .select('username email totalWinnings totalBets balance')
          .lean();

        const userMap = {};
        users.forEach(u => {
          userMap[u._id.toString()] = u;
        });

        leaderboard = betTransactions.map(t => ({
          ...userMap[t._id.toString()],
          totalBets: t.totalBets
        })).filter(u => u.username);
      }

      // Format response
      leaderboard = leaderboard.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        email: user.email,
        value: user.totalBets || 0,
        totalWinnings: user.totalWinnings || 0,
        balance: user.balance || 0
      }));
    }

    res.json({
      category,
      period,
      leaderboard
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

