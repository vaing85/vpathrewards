/**
 * Performance Monitoring Middleware
 * Tracks API response times and logs performance metrics
 */

const PerformanceMetric = require('../models/PerformanceMetric');

// In-memory cache for performance metrics (last 100 requests)
const performanceCache = {
  apiMetrics: [],
  maxCacheSize: 100
};

/**
 * Middleware to track API response times
 */
const trackApiPerformance = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Store request metadata
  req.performanceId = requestId;
  req.startTime = startTime;

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log performance metric
    const metric = {
      requestId,
      method: req.method,
      path: req.path,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?._id?.toString() || null
    };

    // Add to cache
    performanceCache.apiMetrics.push(metric);
    if (performanceCache.apiMetrics.length > performanceCache.maxCacheSize) {
      performanceCache.apiMetrics.shift(); // Remove oldest
    }

    // Save to database (async, don't block response)
    PerformanceMetric.create(metric).catch(err => {
      console.error('Error saving performance metric:', err);
    });

    // Restore original end function
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Get performance statistics
 */
const getPerformanceStats = async (timeRange = '1h') => {
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
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
  }

  try {
    const metrics = await PerformanceMetric.find({
      timestamp: { $gte: startTime }
    }).sort({ timestamp: -1 });

    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        statusCodes: {},
        slowestEndpoints: [],
        fastestEndpoints: []
      };
    }

    const responseTimes = metrics.map(m => m.responseTime);
    const totalRequests = metrics.length;
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    // Calculate requests per second
    const timeSpan = (now.getTime() - startTime.getTime()) / 1000; // seconds
    const requestsPerSecond = totalRequests / timeSpan;

    // Status code distribution
    const statusCodes = {};
    metrics.forEach(m => {
      statusCodes[m.statusCode] = (statusCodes[m.statusCode] || 0) + 1;
    });

    // Endpoint performance
    const endpointStats = {};
    metrics.forEach(m => {
      const endpoint = m.route || m.path;
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = {
          count: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      endpointStats[endpoint].count++;
      endpointStats[endpoint].totalTime += m.responseTime;
      endpointStats[endpoint].minTime = Math.min(endpointStats[endpoint].minTime, m.responseTime);
      endpointStats[endpoint].maxTime = Math.max(endpointStats[endpoint].maxTime, m.responseTime);
    });

    const slowestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.totalTime / stats.count,
        count: stats.count,
        minTime: stats.minTime,
        maxTime: stats.maxTime
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    const fastestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      minResponseTime,
      maxResponseTime,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      statusCodes,
      slowestEndpoints,
      fastestEndpoints,
      timeRange
    };
  } catch (error) {
    console.error('Error getting performance stats:', error);
    throw error;
  }
};

/**
 * Get cached performance metrics
 */
const getCachedMetrics = () => {
  return performanceCache.apiMetrics;
};

module.exports = {
  trackApiPerformance,
  getPerformanceStats,
  getCachedMetrics
};

