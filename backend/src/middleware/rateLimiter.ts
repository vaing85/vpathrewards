import rateLimit from 'express-rate-limit';
import { securityConfig } from '../config/securityConfig';

const { rateLimit: rl } = securityConfig;

export const apiLimiter = rateLimit({
  windowMs: rl.api.windowMs,
  max: rl.api.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
});

export const authLimiter = rateLimit({
  windowMs: rl.auth.windowMs,
  max: rl.auth.max,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordLimiter = rateLimit({
  windowMs: rl.password.windowMs,
  max: rl.password.max,
  message: 'Too many password change attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const withdrawalLimiter = rateLimit({
  windowMs: rl.withdrawal.windowMs,
  max: rl.withdrawal.max,
  message: 'Too many withdrawal requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminLimiter = rateLimit({
  windowMs: rl.admin.windowMs,
  max: rl.admin.max,
  message: 'Too many admin requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const trackingLimiter = rateLimit({
  windowMs: rl.tracking.windowMs,
  max: rl.tracking.max,
  message: 'Too many tracking requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
