const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['games', 'winnings', 'streaks', 'milestones', 'special'],
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  requirement: {
    type: {
      type: String,
      enum: ['games_played', 'games_won', 'total_winnings', 'biggest_win', 'win_streak', 'game_specific', 'balance', 'total_bets', 'consecutive_days'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    game: {
      type: String,
      default: null
    }
  },
  reward: {
    type: {
      type: String,
      enum: ['bonus', 'badge', 'title'],
      default: 'badge'
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries (code already indexed via unique: true)
achievementSchema.index({ category: 1 });
achievementSchema.index({ isActive: 1 });

module.exports = mongoose.model('Achievement', achievementSchema);

