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
