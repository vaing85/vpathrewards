/**
 * Centralized app and environment configuration.
 * Load dotenv before importing this (e.g. import 'dotenv/config' first in entry point).
 */

const nodeEnv = process.env.NODE_ENV || 'development';
const port = process.env.PORT || '3001';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

export const appConfig = {
  nodeEnv: nodeEnv as 'development' | 'production' | 'test',
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',

  port: parseInt(port, 10) || 3001,
  frontendUrl: frontendUrl.replace(/\/$/, ''), // no trailing slash

  log: {
    level: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
    toFile: process.env.LOG_TO_FILE === 'true',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
    /** True when SMTP env vars are set (used to skip sending in production if not configured) */
    configured: !!(process.env.SMTP_HOST || process.env.SMTP_USER),
    /** Use Ethereal (fake SMTP) in development when SMTP_HOST is not set */
    useEtherealInDev: nodeEnv === 'development' && !process.env.SMTP_HOST,
  },
} as const;

export type AppConfig = typeof appConfig;
