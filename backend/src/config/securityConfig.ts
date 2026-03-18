/**
 * Centralized security configuration (JWT, CORS, rate limits).
 * Load dotenv before importing this (e.g. import 'dotenv/config' first in entry point).
 */

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    /** Token expiry (e.g. '7d', '24h'). */
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  rateLimit: {
    api: {
      windowMs: 15 * 60 * 1000,
      max: isProduction ? 100 : 1000,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: isProduction ? 5 : 50,
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
  },
} as const;

export type SecurityConfig = typeof securityConfig;
