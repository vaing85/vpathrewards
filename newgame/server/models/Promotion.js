const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['welcome', 'deposit', 'daily_login', 'custom'],
    required: true
  },
  bonusType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true
  },
  bonusValue: {
    type: Number,
    required: true,
    min: 0
  },
  minDeposit: {
    type: Number,
    default: 0,
    min: 0
  },
  maxBonus: {
    type: Number,
    default: null,
    min: 0
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  maxUses: {
    type: Number,
    default: null,
    min: 0
  },
  currentUses: {
    type: Number,
    default: 0,
    min: 0
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
promotionSchema.index({ active: 1, type: 1, startDate: 1, endDate: 1 });

promotionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Promotion', promotionSchema);

