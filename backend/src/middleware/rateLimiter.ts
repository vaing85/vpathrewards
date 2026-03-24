/**
 * Rate limiting middleware.
 *
 * Current implementation uses the default in-memory store from express-rate-limit,
 * which works correctly for single-process deployments.
 *
 * TODO (Redis-backed rate limiting): For multi-instance / horizontally-scaled
 * deployments, replace the in-memory store with a shared Redis store so that
 * rate-limit counters are consistent across all nodes.  Install and configure:
 *
 *   npm install rate-limit-redis ioredis
 *
 * Then pass a RedisStore instance to each rateLimit() call:
 *
 *   import RedisStore from 'rate-limit-redis';
 *   import Redis from 'ioredis';
 *   const redis = new Redis(process.env.REDIS_URL);
 *   store: new RedisStore({ sendCommand: (...args) => redis.call(...args) })
 */

import rateLimit from 'express-rate-limit';
import { securityConfig } from '../config/securityConfig';

const { api: apiLimits, auth: authLimits, password: passwordLimits, withdrawal: withdrawalLimits, admin: adminLimits, tracking: trackingLimits } = securityConfig.rateLimit;

export const apiLimiter = rateLimit({
  windowMs: apiLimits.windowMs,
  max: apiLimits.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

export const authLimiter = rateLimit({
  windowMs: authLimits.windowMs,
  max: authLimits.max,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordLimiter = rateLimit({
  windowMs: passwordLimits.windowMs,
  max: passwordLimits.max,
  message: 'Too many password change attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const withdrawalLimiter = rateLimit({
  windowMs: withdrawalLimits.windowMs,
  max: withdrawalLimits.max,
  message: 'Too many withdrawal requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminLimiter = rateLimit({
  windowMs: adminLimits.windowMs,
  max: adminLimits.max,
  message: 'Too many admin requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const trackingLimiter = rateLimit({
  windowMs: trackingLimits.windowMs,
  max: trackingLimits.max,
  message: 'Too many tracking requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
