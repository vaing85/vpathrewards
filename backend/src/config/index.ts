/**
 * Centralized environment configuration.
 * Ensure dotenv is loaded before importing (e.g. import 'dotenv/config' as first line in server.ts).
 */

export { appConfig, type AppConfig } from './appConfig';
export { dbConfig, type DbConfig } from './dbConfig';
export { securityConfig, type SecurityConfig } from './securityConfig';
