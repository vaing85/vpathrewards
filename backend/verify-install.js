/**
 * Verify Installation Script
 * Run: node verify-install.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Dependencies Installation...\n');

const requiredPackages = [
  'helmet',
  'express-rate-limit',
  'express-validator',
  'nodemailer',
  'express',
  'cors',
  'bcryptjs',
  'jsonwebtoken',
  'sqlite3'
];

const nodeModulesPath = path.join(__dirname, 'node_modules');
let missing = [];
let installed = [];

requiredPackages.forEach(pkg => {
  const pkgPath = path.join(nodeModulesPath, pkg);
  if (fs.existsSync(pkgPath)) {
    installed.push(pkg);
    console.log(`✅ ${pkg} - INSTALLED`);
  } else {
    missing.push(pkg);
    console.log(`❌ ${pkg} - MISSING`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   Installed: ${installed.length}/${requiredPackages.length}`);
console.log(`   Missing: ${missing.length}/${requiredPackages.length}`);

if (missing.length > 0) {
  console.log(`\n❌ Missing packages: ${missing.join(', ')}`);
  console.log('\n💡 Fix: Run this command:');
  console.log('   npm install');
  console.log('\nOr install specific packages:');
  console.log(`   npm install ${missing.join(' ')}`);
  process.exit(1);
} else {
  console.log('\n✅ All required packages are installed!');
  console.log('\n✅ You can now start the server with: npm run dev');
  process.exit(0);
}
