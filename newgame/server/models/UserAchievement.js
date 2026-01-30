const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    type: Number,
    default: 0
  },
  isUnlocked: {
    type: Boolean,
    default: false
  }
});

// Compound index to ensure one achievement per user
userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });
userAchievementSchema.index({ user: 1, isUnlocked: 1 });
userAchievementSchema.index({ unlockedAt: -1 });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);

