/**
 * Generate Secure JWT Secret
 * 
 * Run: node generate-jwt-secret.js
 * 
 * This script generates a cryptographically secure random string
 * suitable for use as JWT_SECRET in production.
 */

const crypto = require('crypto');

function generateJWTSecret() {
  // Generate 32 random bytes and encode as base64
  const secret = crypto.randomBytes(32).toString('base64');
  
  console.log('\n🔐 Generated JWT Secret:\n');
  console.log('='.repeat(60));
  console.log(secret);
  console.log('='.repeat(60));
  console.log('\n✅ Copy this value to your .env file as JWT_SECRET');
  console.log('\n⚠️  IMPORTANT: Keep this secret secure!');
  console.log('   - Never commit it to version control');
  console.log('   - Store it securely (environment variables, secret manager)');
  console.log('   - Use different secrets for development and production\n');
  
  return secret;
}

// Generate and display the secret
generateJWTSecret();
