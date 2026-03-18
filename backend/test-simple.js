/**
 * Simple Test Script - Tests basic connectivity
 * Run with: node test-simple.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

console.log('🧪 Testing Backend API...\n');
console.log(`Testing: ${API_BASE}\n`);
console.log('⚠️  IMPORTANT: Make sure the backend server is running!');
console.log('   Start it with: cd backend && npm run dev\n');

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 2000 });
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is NOT running!\n');
    console.log('Please start the server first:');
    console.log('  1. Open a new terminal');
    console.log('  2. cd backend');
    console.log('  3. npm run dev');
    console.log('  4. Wait for "Server running" message');
    console.log('  5. Then run this test again\n');
    console.log('Or run diagnostics: npm run diagnose\n');
    process.exit(1);
  }
}

async function test() {
  // First check if server is running
  await checkServer();
  
  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    try {
      const health = await axios.get(`${API_BASE}/health`, { timeout: 3000 });
      console.log('   ✅ Health Check: PASSED');
      console.log('   Response:', health.data);
    } catch (error) {
      console.log('   ❌ Health Check: FAILED');
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  Backend server is not running!');
        console.log('   Please start it with: npm run dev');
        process.exit(1);
      } else {
        console.log('   Error:', error.message);
      }
      return;
    }

    // Test 2: Get Merchants
    console.log('\n2. Testing Get Merchants...');
    try {
      const merchants = await axios.get(`${API_BASE}/merchants`, { timeout: 3000 });
      console.log('   ✅ Get Merchants: PASSED');
      console.log(`   Found ${merchants.data.length} merchants`);
    } catch (error) {
      console.log('   ❌ Get Merchants: FAILED');
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 3: Get Offers
    console.log('\n3. Testing Get Offers...');
    try {
      const offers = await axios.get(`${API_BASE}/offers`, { timeout: 3000 });
      console.log('   ✅ Get Offers: PASSED');
      console.log(`   Found ${offers.data.length} offers`);
    } catch (error) {
      console.log('   ❌ Get Offers: FAILED');
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 4: User Registration
    console.log('\n4. Testing User Registration...');
    try {
      const email = `test${Date.now()}@example.com`;
      const register = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password: 'Test123!',
        name: 'Test User'
      }, { timeout: 3000 });
      
      if (register.data.token) {
        console.log('   ✅ User Registration: PASSED');
        console.log(`   User ID: ${register.data.user?.id}`);
        console.log(`   Email: ${email}`);
      } else {
        console.log('   ⚠️  Registration succeeded but no token received');
      }
    } catch (error) {
      console.log('   ❌ User Registration: FAILED');
      console.log('   Error:', error.response?.data || error.message);
    }

    // Test 5: Admin Login
    console.log('\n5. Testing Admin Login...');
    try {
      const admin = await axios.post(`${API_BASE}/admin/auth/login`, {
        email: 'admin@cashback.com',
        password: 'admin123'
      }, { timeout: 3000 });
      
      if (admin.data.token) {
        console.log('   ✅ Admin Login: PASSED');
      } else {
        console.log('   ⚠️  Login succeeded but no token received');
      }
    } catch (error) {
      console.log('   ❌ Admin Login: FAILED');
      console.log('   Error:', error.response?.data || error.message);
    }

    console.log('\n✅ Basic tests completed!');
    console.log('\nFor full testing, run: npm run test:flows');
    console.log('\nIf tests failed, run diagnostics: npm run diagnose');
    console.log('Or check TROUBLESHOOTING_GUIDE.md for help');

  } catch (error) {
    console.log('\n❌ Test suite error:', error.message);
    process.exit(1);
  }
}

test();
