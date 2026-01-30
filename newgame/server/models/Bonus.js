const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['welcome', 'daily_login', 'deposit', 'promotion', 'referral'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'used', 'expired', 'cancelled'],
    default: 'active'
  },
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
bonusSchema.index({ user: 1, status: 1, createdAt: -1 });
bonusSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Bonus', bonusSchema);

