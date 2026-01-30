const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { createNotification } = require('./notifications');
const { checkAndUnlockAchievements } = require('./achievements');

/**
 * Helper function to create game transactions (bet and win)
 * @param {String} userId - User ID
 * @param {String} gameName - Name of the game (e.g., 'slots', 'blackjack')
 * @param {Number} bet - Bet amount
 * @param {Number} win - Win amount (0 if lost)
 * @param {Object} metadata - Additional metadata for the transaction
 * @returns {Object} - { betTransaction, winTransaction, balance }
 */
async function createGameTransactions(userId, gameName, bet, win = 0, metadata = {}) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const balanceBefore = user.balance;

  // Create bet transaction
  user.balance -= bet;
  const balanceAfterBet = user.balance;

  const betTransaction = new Transaction({
    user: userId,
    type: 'bet',
    amount: bet,
    balanceBefore,
    balanceAfter: balanceAfterBet,
    status: 'completed',
    game: gameName,
    description: `${gameName.charAt(0).toUpperCase() + gameName.slice(1)} bet of $${bet.toFixed(2)}`,
    metadata: { ...metadata, bet }
  });

  await betTransaction.save();

  // Create win transaction if player won
  let winTransaction = null;
  if (win > 0) {
    const balanceBeforeWin = user.balance;
    user.balance += win;
    const balanceAfterWin = user.balance;

    winTransaction = new Transaction({
      user: userId,
      type: 'win',
      amount: win,
      balanceBefore: balanceBeforeWin,
      balanceAfter: balanceAfterWin,
      status: 'completed',
      game: gameName,
      description: `${gameName.charAt(0).toUpperCase() + gameName.slice(1)} win of $${win.toFixed(2)}`,
      metadata: { ...metadata, bet, win }
    });

    await winTransaction.save();
  }

  // Update user stats
  user.totalBets += bet;
  if (win > 0) {
    user.totalWinnings += win;
  }

  await user.save();

  // Create notification for big wins (win > $100 or win > 10x bet)
  if (win > 0 && (win >= 100 || win >= bet * 10)) {
    try {
      await createNotification(
        userId,
        'big_win',
        '🎉 Big Win!',
        `Congratulations! You won $${win.toFixed(2)} playing ${gameName}!`,
        {
          game: gameName,
          bet: bet,
          win: win,
          transactionId: winTransaction._id
        }
      );
    } catch (error) {
      console.error('Error creating big win notification:', error);
      // Don't fail the transaction if notification fails
    }
  }

  // Check and unlock achievements (async, don't block)
  checkAndUnlockAchievements(userId)
    .then(newlyUnlocked => {
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        // Create notifications for newly unlocked achievements
        newlyUnlocked.forEach(achievement => {
          createNotification(
            userId,
            'achievement',
            `🏆 Achievement Unlocked!`,
            `${achievement.name}: ${achievement.description}`,
            {
              achievement: achievement.code,
              reward: achievement.reward
            }
          ).catch(err => console.error('Error creating achievement notification:', err));
        });
      }
    })
    .catch(err => {
      console.error('Error checking achievements:', err);
      // Don't fail the transaction if achievement check fails
    });

  return {
    betTransaction,
    winTransaction,
    balance: user.balance
  };
}

module.exports = { createGameTransactions };

