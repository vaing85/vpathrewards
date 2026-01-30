const mongoose = require('mongoose');

const performanceMetricSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  path: {
    type: String,
    required: true
  },
  route: {
    type: String
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number,
    required: true // in milliseconds
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: {
    type: String
  },
  ip: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
performanceMetricSchema.index({ timestamp: -1 });
performanceMetricSchema.index({ path: 1, timestamp: -1 });
performanceMetricSchema.index({ statusCode: 1, timestamp: -1 });
performanceMetricSchema.index({ responseTime: -1 });

// TTL index to auto-delete old metrics after 30 days
performanceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);

