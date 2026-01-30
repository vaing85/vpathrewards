const mongoose = require('mongoose');

const webVitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['CLS', 'FID', 'LCP', 'FCP', 'TTFB']
  },
  value: {
    type: Number,
    required: true
  },
  metricId: {
    type: String
  },
  delta: {
    type: Number
  },
  rating: {
    type: String,
    enum: ['good', 'needs-improvement', 'poor']
  },
  navigationType: {
    type: String
  },
  url: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
webVitalSchema.index({ timestamp: -1 });
webVitalSchema.index({ name: 1, timestamp: -1 });
webVitalSchema.index({ userId: 1, timestamp: -1 });

// TTL index to auto-delete old metrics after 30 days
webVitalSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('WebVital', webVitalSchema);

