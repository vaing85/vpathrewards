/**
 * Diagnostic Script - Checks common issues before testing
 * Run with: node diagnose.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Diagnostics...\n');

let issues = [];
let warnings = [];

// Check 1: Node version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (majorVersion >= 18) {
    console.log('✅ Node.js version:', nodeVersion);
  } else {
    issues.push(`Node.js version ${nodeVersion} is too old. Need 18+`);
    console.log('❌ Node.js version:', nodeVersion, '(Need 18+)');
  }
}

// Check 2: Package.json exists
function checkPackageJson() {
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    console.log('✅ package.json exists');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check required dependencies
    const required = ['express', 'cors', 'bcryptjs', 'jsonwebtoken', 'sqlite3'];
    const missing = required.filter(dep => !pkg.dependencies[dep]);
    
    if (missing.length === 0) {
      console.log('✅ All required dependencies in package.json');
    } else {
      issues.push(`Missing dependencies: ${missing.join(', ')}`);
      console.log('❌ Missing dependencies:', missing.join(', '));
    }
  } else {
    issues.push('package.json not found');
    console.log('❌ package.json not found');
  }
}

// Check 3: node_modules exists
function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules exists');
    
    // Check key modules
    const keyModules = ['express', 'sqlite3'];
    const missing = keyModules.filter(mod => {
      return !fs.existsSync(path.join(nodeModulesPath, mod));
    });
    
    if (missing.length === 0) {
      console.log('✅ Key modules installed');
    } else {
      issues.push(`Missing node_modules: ${missing.join(', ')}`);
      console.log('❌ Missing modules:', missing.join(', '));
      console.log('   Run: npm install');
    }
  } else {
    issues.push('node_modules not found');
    console.log('❌ node_modules not found');
    console.log('   Run: npm install');
  }
}

// Check 4: .env file
function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    
    // Check required vars
    const envContent = fs.readFileSync(envPath, 'utf8');
    const required = ['PORT', 'JWT_SECRET', 'NODE_ENV', 'FRONTEND_URL'];
    const missing = required.filter(varName => {
      return !envContent.includes(`${varName}=`);
    });
    
    if (missing.length === 0) {
      console.log('✅ Required environment variables present');
    } else {
      warnings.push(`Missing env vars: ${missing.join(', ')}`);
      console.log('⚠️  Missing env vars:', missing.join(', '));
    }
  } else {
    if (fs.existsSync(envExamplePath)) {
      warnings.push('.env file not found (but .env.example exists)');
      console.log('⚠️  .env file not found');
      console.log('   Copy .env.example to .env');
    } else {
      issues.push('.env file not found and no .env.example');
      console.log('❌ .env file not found');
    }
  }
}

// Check 5: Database file
function checkDatabase() {
  const dbPath = path.join(__dirname, 'cashback.db');
  if (fs.existsSync(dbPath)) {
    console.log('✅ Database file exists');
    
    // Check if writable
    try {
      fs.accessSync(dbPath, fs.constants.W_OK);
      console.log('✅ Database file is writable');
    } catch (error) {
      issues.push('Database file is not writable');
      console.log('❌ Database file is not writable');
    }
  } else {
    warnings.push('Database file not found (will be created on first run)');
    console.log('⚠️  Database file not found (will be created)');
  }
}

// Check 6: Port availability
async function checkPort() {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(3001, () => {
      server.once('close', () => {
        console.log('✅ Port 3001 is available');
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        issues.push('Port 3001 is already in use');
        console.log('❌ Port 3001 is already in use');
        console.log('   Another process is using the port');
        console.log('   Stop it or change PORT in .env');
        resolve(false);
      } else {
        console.log('⚠️  Could not check port:', err.message);
        resolve(false);
      }
    });
  });
}

// Check 7: Build files
function checkBuild() {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    const serverJs = path.join(distPath, 'server.js');
    if (fs.existsSync(serverJs)) {
      console.log('✅ Build files exist');
    } else {
      warnings.push('dist/server.js not found (run: npm run build)');
      console.log('⚠️  dist/server.js not found');
      console.log('   Run: npm run build');
    }
  } else {
    warnings.push('dist folder not found (not critical for dev mode)');
    console.log('⚠️  dist folder not found (ok for dev mode)');
  }
}

// Check 8: TypeScript config
function checkTypeScript() {
  const tsConfigPath = path.join(__dirname, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    console.log('✅ tsconfig.json exists');
  } else {
    warnings.push('tsconfig.json not found');
    console.log('⚠️  tsconfig.json not found');
  }
}

// Run all checks
async function runDiagnostics() {
  console.log('🔍 Running Diagnostics...\n');
  console.log('Checking environment...\n');
  
  checkNodeVersion();
  checkPackageJson();
  checkNodeModules();
  checkEnvFile();
  checkDatabase();
  checkBuild();
  checkTypeScript();
  
  console.log('\nChecking port availability...');
  const portAvailable = await checkPort();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Diagnostic Summary\n');
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!');
    console.log('\n✅ You can start the server with: npm run dev');
    console.log('✅ Then run tests with: npm run test:simple');
    console.log('\n' + '='.repeat(50));
  } else {
    if (issues.length > 0) {
      console.log('❌ Critical Issues Found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      console.log('\n⚠️  Please fix these issues before running tests.');
      console.log('\n💡 Quick fixes:');
      if (issues.some(i => i.includes('node_modules'))) {
        console.log('   → Run: npm install');
      }
      if (issues.some(i => i.includes('.env'))) {
        console.log('   → Copy .env.example to .env and configure it');
      }
      if (issues.some(i => i.includes('Port'))) {
        console.log('   → Stop other process using port 3001 or change PORT in .env');
      }
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings (may not prevent running):');
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  return {
    issues,
    warnings,
    canRun: issues.length === 0
  };
}

// Run if executed directly
if (require.main === module) {
  runDiagnostics().then(result => {
    if (!result.canRun) {
      process.exit(1);
    }
  });
}

module.exports = { runDiagnostics };
