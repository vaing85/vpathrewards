/**
 * Centralized security configuration (JWT, CORS, rate limits).
 * Load dotenv before importing this (e.g. import 'dotenv/config' first in entry point).
 */

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production.');
  } else {
    console.warn('WARNING: JWT_SECRET is not set. Using insecure default — do NOT use in production.');
  }
}

export const securityConfig = {
  jwt: {
    secret: jwtSecret || 'dev-only-insecure-secret',
    /** Token expiry (e.g. '7d', '24h'). */
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'https://vpathrewards.store',
        'https://www.vpathrewards.store',
        'https://vaing85.github.io',
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  rateLimit: {
    api: {
      windowMs: 15 * 60 * 1000,
      max: isProduction ? 300 : 1000,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: isProduction ? 20 : 50,
    },
    password: {
      windowMs: 60 * 60 * 1000,
      max: 3,
    },
    withdrawal: {
      windowMs: 60 * 60 * 1000,
      max: 5,
    },
    admin: {
      windowMs: 15 * 60 * 1000,
      max: 50,
    },
    tracking: {
      windowMs: 60 * 1000, // 1 minute
      max: isProduction ? 30 : 200,
    },
  },
} as const;

export type SecurityConfig = typeof securityConfig;
