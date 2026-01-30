/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse by limiting the number of requests per IP address
 * Uses in-memory store (for production, use Redis)
 */

const rateLimitStore = new Map();

/**
 * Rate limiter middleware
 * @param {object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message (default: 'Too many requests')
 */
const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean up old entries
    if (rateLimitStore.size > 10000) {
      // Prevent memory leak - clear old entries
      for (const [k, v] of rateLimitStore.entries()) {
        if (now - v.resetTime > windowMs) {
          rateLimitStore.delete(k);
        }
      }
    }

    const record = rateLimitStore.get(key);

    if (!record) {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (now > record.resetTime) {
      // Window expired, reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        error: message,
        retryAfter: retryAfter
      });
      return;
    }

    // Increment count
    record.count++;
    next();
  };
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

/**
 * Game play rate limiter
 */
const gameRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 game plays per minute
  message: 'Too many game plays, please slow down.'
});

/**
 * API rate limiter (general)
 */
const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.'
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  gameRateLimiter,
  apiRateLimiter
};

