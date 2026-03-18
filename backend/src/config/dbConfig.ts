/**
 * Centralized database configuration.
 * Requires DATABASE_URL to be set in the environment (via .env or host config).
 */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. See .env.example.');
}

export const dbConfig = {
  url: process.env.DATABASE_URL,
} as const;

export type DbConfig = typeof dbConfig;
