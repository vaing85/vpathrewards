/**
 * Simple Environment Check
 * Run with: node check-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Environment Check\n');
console.log('='.repeat(50));

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
console.log(`Node.js: ${nodeVersion} ${majorVersion >= 18 ? '✅' : '❌ (Need 18+)'}`);

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  console.log('package.json: ✅ EXISTS');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   Dependencies: ${Object.keys(pkg.dependencies || {}).length} packages`);
} else {
  console.log('package.json: ❌ MISSING');
}

// Check node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('node_modules: ✅ EXISTS');
  
  // Check key packages
  const keyPackages = ['express', 'cors', 'sqlite3', 'helmet', 'nodemailer'];
  const missing = keyPackages.filter(pkg => {
    return !fs.existsSync(path.join(nodeModulesPath, pkg));
  });
  
  if (missing.length === 0) {
    console.log('   Key packages: ✅ ALL INSTALLED');
  } else {
    console.log(`   Key packages: ❌ MISSING: ${missing.join(', ')}`);
    console.log('   → Run: npm install');
  }
} else {
  console.log('node_modules: ❌ MISSING');
  console.log('   → Run: npm install');
}

// Check .env
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envPath)) {
  console.log('.env file: ✅ EXISTS');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasJWT = envContent.includes('JWT_SECRET=');
  const hasPort = envContent.includes('PORT=');
  const hasFrontend = envContent.includes('FRONTEND_URL=');
  
  console.log(`   JWT_SECRET: ${hasJWT ? '✅' : '❌'}`);
  console.log(`   PORT: ${hasPort ? '✅' : '❌'}`);
  console.log(`   FRONTEND_URL: ${hasFrontend ? '✅' : '❌'}`);
} else {
  if (fs.existsSync(envExamplePath)) {
    console.log('.env file: ⚠️  MISSING (but .env.example exists)');
    console.log('   → Copy .env.example to .env');
  } else {
    console.log('.env file: ❌ MISSING');
  }
}

// Check database
const dbPath = path.join(__dirname, 'cashback.db');
if (fs.existsSync(dbPath)) {
  console.log('Database: ✅ EXISTS');
  try {
    fs.accessSync(dbPath, fs.constants.W_OK);
    console.log('   Writable: ✅');
  } catch {
    console.log('   Writable: ❌');
  }
} else {
  console.log('Database: ⚠️  MISSING (will be created on first run)');
}

// Check build
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  const serverJs = path.join(distPath, 'server.js');
  if (fs.existsSync(serverJs)) {
    console.log('Build files: ✅ EXISTS');
  } else {
    console.log('Build files: ⚠️  dist folder exists but server.js missing');
    console.log('   → Run: npm run build');
  }
} else {
  console.log('Build files: ⚠️  MISSING (not needed for dev mode)');
}

console.log('\n' + '='.repeat(50));
console.log('\n💡 Next Steps:');
console.log('   1. If any ❌ issues, fix them first');
console.log('   2. Start server: npm run dev');
console.log('   3. Run tests: npm run test:simple');
console.log('\n');
