/**
 * Production Environment Validation Script
 * 
 * Run: node validate-production.js
 * 
 * This script validates that all required production environment
 * variables are set and configured correctly.
 */

// Try to load .env.production first, fallback to .env
require('dotenv').config({ path: '.env.production' });
require('dotenv').config(); // Fallback to .env if .env.production doesn't exist

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateProduction() {
  log('\n🔍 Validating Production Configuration...\n', 'blue');
  
  const errors = [];
  const warnings = [];
  const checks = [];

  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV is not set to "production"');
  } else {
    checks.push('✅ NODE_ENV is set to production');
  }

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET is too short (should be at least 32 characters)');
  } else if (process.env.JWT_SECRET.includes('dev') || process.env.JWT_SECRET.includes('change')) {
    errors.push('JWT_SECRET appears to be a development/placeholder value');
  } else {
    checks.push('✅ JWT_SECRET is set and appears secure');
  }

  // Check FRONTEND_URL
  if (!process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL is not set');
  } else if (process.env.FRONTEND_URL.includes('localhost')) {
    warnings.push('FRONTEND_URL points to localhost (should be production domain)');
  } else if (!process.env.FRONTEND_URL.startsWith('https://')) {
    warnings.push('FRONTEND_URL should use HTTPS in production');
  } else {
    checks.push('✅ FRONTEND_URL is configured');
  }

  // Check SMTP Configuration
  if (!process.env.SMTP_HOST) {
    warnings.push('SMTP_HOST is not set (emails will not work)');
  } else {
    checks.push('✅ SMTP_HOST is configured');
  }

  if (process.env.SMTP_HOST && !process.env.SMTP_USER) {
    errors.push('SMTP_USER is required when SMTP_HOST is set');
  } else if (process.env.SMTP_USER) {
    checks.push('✅ SMTP_USER is configured');
  }

  if (process.env.SMTP_HOST && !process.env.SMTP_PASS) {
    errors.push('SMTP_PASS is required when SMTP_HOST is set');
  } else if (process.env.SMTP_PASS) {
    checks.push('✅ SMTP_PASS is configured');
  }

  if (process.env.SMTP_FROM) {
    checks.push('✅ SMTP_FROM is configured');
  } else {
    warnings.push('SMTP_FROM is not set (will use SMTP_USER as sender)');
  }

  // Check PORT
  if (process.env.PORT) {
    checks.push(`✅ PORT is set to ${process.env.PORT}`);
  } else {
    warnings.push('PORT is not set (will default to 3001)');
  }

  // Check Logging
  if (process.env.LOG_TO_FILE === 'true') {
    checks.push('✅ File logging is enabled');
  } else {
    warnings.push('LOG_TO_FILE is not set to "true" (logs will only go to console)');
  }

  // Display Results
  console.log('='.repeat(60));
  log('\n📋 Configuration Checks:', 'blue');
  checks.forEach(check => log(`   ${check}`, 'green'));

  if (warnings.length > 0) {
    console.log('\n' + '='.repeat(60));
    log('\n⚠️  Warnings:', 'yellow');
    warnings.forEach(warning => log(`   ⚠️  ${warning}`, 'yellow'));
  }

  if (errors.length > 0) {
    console.log('\n' + '='.repeat(60));
    log('\n❌ Errors:', 'red');
    errors.forEach(error => log(`   ❌ ${error}`, 'red'));
  }

  console.log('\n' + '='.repeat(60));

  // Summary
  if (errors.length === 0 && warnings.length === 0) {
    log('\n✅ All production configuration checks passed!', 'green');
    log('   Your environment is ready for production deployment.\n', 'green');
    return true;
  } else if (errors.length === 0) {
    log('\n⚠️  Configuration has warnings but no critical errors.', 'yellow');
    log('   Review warnings before deploying to production.\n', 'yellow');
    return true;
  } else {
    log('\n❌ Configuration has errors that must be fixed.', 'red');
    log('   Please fix the errors above before deploying.\n', 'red');
    return false;
  }
}

// Run validation
const isValid = validateProduction();
process.exit(isValid ? 0 : 1);
