const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorLogger');

/**
 * Get all available achievements
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  // Fetch achievements and user progress in parallel for better performance
  const [achievements, userAchievements] = await Promise.all([
    Achievement.find({ isActive: true })
      .sort({ category: 1, 'requirement.value': 1 })
      .lean(),
    UserAchievement.find({ user: req.user._id })
      .select('achievement isUnlocked unlockedAt progress')
      .lean()
  ]);

  // Create a map of achievement IDs to user progress (more efficient than populate)
  const userAchievementMap = {};
  userAchievements.forEach(ua => {
    // With .lean(), achievement is an ObjectId, convert to string
    const achievementId = ua.achievement.toString();
    userAchievementMap[achievementId] = {
      isUnlocked: ua.isUnlocked,
      unlockedAt: ua.unlockedAt,
      progress: ua.progress
    };
  });

  // Merge achievements with user progress
  const achievementsWithProgress = achievements.map(achievement => ({
    ...achievement,
    userProgress: userAchievementMap[achievement._id.toString()] || {
      isUnlocked: false,
      progress: 0
    }
  }));

  res.json({ achievements: achievementsWithProgress });
}));

/**
 * Get user's unlocked achievements
 */
router.get('/unlocked', auth, asyncHandler(async (req, res) => {
  const userAchievements = await UserAchievement.find({
    user: req.user._id,
    isUnlocked: true
  })
    .populate('achievement')
    .sort({ unlockedAt: -1 })
    .lean();

  res.json({ achievements: userAchievements.map(ua => ({
    ...ua.achievement,
    unlockedAt: ua.unlockedAt
  })) });
}));

/**
 * Get user's achievement progress
 */
router.get('/progress', auth, asyncHandler(async (req, res) => {
  const userAchievements = await UserAchievement.find({ user: req.user._id })
    .populate('achievement')
    .lean();

  const progress = userAchievements.map(ua => ({
    achievementId: ua.achievement._id,
    code: ua.achievement.code,
    name: ua.achievement.name,
    isUnlocked: ua.isUnlocked,
    progress: ua.progress,
    requirement: ua.achievement.requirement,
    unlockedAt: ua.unlockedAt
  }));

  res.json({ progress });
}));

/**
 * Manually check and unlock achievements for a user
 * (Usually called automatically after game actions)
 */
router.post('/check', auth, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const newlyUnlocked = await checkAndUnlockAchievements(userId);
  
  res.json({
    newlyUnlocked: newlyUnlocked.length,
    achievements: newlyUnlocked
  });
}));

/**
 * Achievement checking service
 * This function checks all achievements and unlocks any that are met
 */
async function checkAndUnlockAchievements(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const achievements = await Achievement.find({ isActive: true }).lean();
  const userAchievements = await UserAchievement.find({ user: userId })
    .populate('achievement')
    .lean();

  const userAchievementMap = {};
  userAchievements.forEach(ua => {
    userAchievementMap[ua.achievement._id.toString()] = ua;
  });

  const newlyUnlocked = [];

  for (const achievement of achievements) {
    const existing = userAchievementMap[achievement._id.toString()];
    
    // Skip if already unlocked
    if (existing && existing.isUnlocked) continue;

    let progress = 0;
    let isUnlocked = false;

    const req = achievement.requirement;

    switch (req.type) {
      case 'games_played':
        progress = Object.values(user.gamesPlayed || {}).reduce((sum, count) => sum + count, 0);
        isUnlocked = progress >= req.value;
        break;

      case 'games_won':
        const winCount = await Transaction.countDocuments({
          user: userId,
          type: 'win',
          status: 'completed'
        });
        progress = winCount;
        isUnlocked = progress >= req.value;
        break;

      case 'total_winnings':
        progress = user.totalWinnings || 0;
        isUnlocked = progress >= req.value;
        break;

      case 'biggest_win':
        const biggestWin = await Transaction.findOne({
          user: userId,
          type: 'win',
          status: 'completed'
        }).sort({ amount: -1 });
        progress = biggestWin ? biggestWin.amount : 0;
        isUnlocked = progress >= req.value;
        break;

      case 'game_specific':
        if (req.game) {
          const gameKey = req.game.toLowerCase().replace(/\s+/g, '');
          progress = user.gamesPlayed?.[gameKey] || 0;
          isUnlocked = progress >= req.value;
        }
        break;

      case 'balance':
        progress = user.balance || 0;
        isUnlocked = progress >= req.value;
        break;

      case 'total_bets':
        progress = user.totalBets || 0;
        isUnlocked = progress >= req.value;
        break;

      case 'win_streak':
        // Calculate current win streak by matching bet/win pairs
        const recentBets = await Transaction.find({
          user: userId,
          type: 'bet',
          status: 'completed',
          game: { $exists: true, $ne: null }
        })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        if (recentBets.length === 0) {
          progress = 0;
          isUnlocked = false;
          break;
        }

        // Calculate time range for all bets
        const betTimes = recentBets.map(tx => tx.createdAt.getTime());
        const earliestBet = Math.min(...betTimes) - 10000;
        const latestBet = Math.max(...betTimes) + 10000;
        const games = [...new Set(recentBets.map(tx => tx.game))];

        // Fetch all matching win transactions in a single query
        const winTransactions = await Transaction.find({
          user: userId,
          type: 'win',
          game: { $in: games },
          status: 'completed',
          createdAt: {
            $gte: new Date(earliestBet),
            $lte: new Date(latestBet)
          }
        })
          .sort({ createdAt: 1 })
          .lean();

        // Create a map for fast win lookup
        const winMap = new Map();
        winTransactions.forEach(winTx => {
          const game = winTx.game;
          const winTime = winTx.createdAt.getTime();
          
          recentBets.forEach(betTx => {
            if (betTx.game === game) {
              const betTime = betTx.createdAt.getTime();
              const timeDiff = Math.abs(winTime - betTime);
              
              if (timeDiff <= 10000) {
                const key = betTx._id.toString();
                if (!winMap.has(key) || timeDiff < Math.abs(winMap.get(key).createdAt.getTime() - betTime)) {
                  winMap.set(key, winTx);
                }
              }
            }
          });
        });

        // Calculate streak
        let streak = 0;
        for (const betTx of recentBets) {
          if (winMap.has(betTx._id.toString())) {
            streak++;
          } else {
            break;
          }
        }
        progress = streak;
        isUnlocked = progress >= req.value;
        break;

      case 'consecutive_days':
        // Calculate consecutive login days
        // For now, we'll use a simple check based on recent activity
        const daysActive = await Transaction.distinct('createdAt', {
          user: userId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        progress = daysActive.length;
        isUnlocked = progress >= req.value;
        break;
    }

    // Update or create user achievement
    if (existing) {
      const wasUnlocked = existing.isUnlocked;
      existing.progress = progress;
      existing.isUnlocked = isUnlocked;
      if (isUnlocked && !wasUnlocked) {
        existing.unlockedAt = new Date();
        newlyUnlocked.push(achievement);
      }
      await UserAchievement.findByIdAndUpdate(existing._id, {
        progress,
        isUnlocked,
        unlockedAt: isUnlocked ? (existing.unlockedAt || new Date()) : existing.unlockedAt
      });
    } else {
      const newUserAchievement = new UserAchievement({
        user: userId,
        achievement: achievement._id,
        progress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : null
      });
      await newUserAchievement.save();
      if (isUnlocked) {
        newlyUnlocked.push(achievement);
      }
    }

    // Apply reward if unlocked
    if (isUnlocked && achievement.reward.type === 'bonus' && achievement.reward.amount > 0) {
      user.balance += achievement.reward.amount;
      await user.save();

      // Create bonus transaction
      const bonusTx = new Transaction({
        user: userId,
        type: 'bonus',
        amount: achievement.reward.amount,
        balanceBefore: user.balance - achievement.reward.amount,
        balanceAfter: user.balance,
        status: 'completed',
        description: `Achievement reward: ${achievement.name}`,
        metadata: { achievement: achievement.code }
      });
      await bonusTx.save();
    }
  }

  return newlyUnlocked;
}

// Export the check function for use in other routes
module.exports = { router, checkAndUnlockAchievements };

