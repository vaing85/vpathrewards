const express = require('express');
const { adminAuth } = require('../middleware/auth');
const { getPerformanceStats, getCachedMetrics } = require('../middleware/performanceMonitor');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const WebVital = require('../models/WebVital');

const router = express.Router();

// Apply more lenient rate limiting for performance endpoints (admin only, less frequent)
const performanceRateLimiter = require('../middleware/rateLimiter').rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes (more lenient for admin monitoring)
  message: 'Too many performance requests, please slow down.'
});

// Store web vitals from client
router.post('/web-vitals', async (req, res) => {
  try {
    const { name, value, id, delta, rating, navigationType, url, timestamp } = req.body;

    await WebVital.create({
      name,
      value,
      metricId: id,
      delta,
      rating,
      navigationType,
      url,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userId: req.user?._id || null
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error storing web vital:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get API performance statistics (admin only)
router.get('/api-stats', adminAuth, performanceRateLimiter, async (req, res) => {
  try {
    const timeRange = req.query.range || '1h';
    const stats = await getPerformanceStats(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get cached performance metrics (admin only)
router.get('/api-metrics', adminAuth, performanceRateLimiter, (req, res) => {
  try {
    const metrics = getCachedMetrics();
    res.json({ metrics, count: metrics.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get web vitals statistics (admin only)
router.get('/web-vitals', adminAuth, performanceRateLimiter, async (req, res) => {
  try {
    const timeRange = req.query.range || '24h';
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const vitals = await WebVital.find({
      timestamp: { $gte: startTime }
    }).sort({ timestamp: -1 });

    // Group by metric name
    const grouped = {};
    vitals.forEach(vital => {
      if (!grouped[vital.name]) {
        grouped[vital.name] = [];
      }
      grouped[vital.name].push(vital.value);
    });

    // Calculate statistics
    const stats = {};
    Object.keys(grouped).forEach(name => {
      const values = grouped[name];
      const sorted = [...values].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];

      stats[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50,
        p75,
        p95
      };
    });

    res.json({
      timeRange,
      stats,
      totalMetrics: vitals.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

