/**
 * Manual Testing Script for Critical User Flows
 * Run with: node test-flows.js
 * 
 * This script helps test API endpoints programmatically
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let userToken = '';
let adminToken = '';
let userId = null;
let offerId = null;
let merchantId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testFlow(name, testFn) {
  logInfo(`\nTesting: ${name}`);
  try {
    await testFn();
    logSuccess(`${name} - PASSED`);
    return true;
  } catch (error) {
    logError(`${name} - FAILED`);
    
    // Detailed error information
    if (error.response) {
      // Server responded with error
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request made but no response
      console.error('   No response from server');
      console.error('   Server may not be running');
      console.error('   Start with: npm run dev');
    } else {
      // Error setting up request
      console.error('   Error:', error.message);
    }
    
    // Provide troubleshooting tips
    if (error.code === 'ECONNREFUSED') {
      logWarning('   → Server is not running. Start with: npm run dev');
    } else if (error.response?.status === 401) {
      logWarning('   → Authentication failed. Check JWT_SECRET in .env');
    } else if (error.response?.status === 404) {
      logWarning('   → Endpoint not found. Check route path');
    } else if (error.response?.status === 500) {
      logWarning('   → Server error. Check server logs for details');
    }
    
    return false;
  }
}

// Flow 1: User Registration
async function testUserRegistration() {
  const email = `test${Date.now()}@example.com`;
  const response = await axios.post(`${API_BASE}/auth/register`, {
    email,
    password: 'Test123!',
    name: 'Test User'
  });
  
  if (response.data.token) {
    userToken = response.data.token;
    userId = response.data.user.id;
    logSuccess(`User registered: ${email}`);
  } else {
    throw new Error('No token received');
  }
}

// Flow 2: User Login (skip if registration just created user)
async function testUserLogin() {
  // Only test login if we didn't just register
  if (userToken) {
    logInfo('User already authenticated from registration');
    return;
  }
  
  // Try to login with a test account (may not exist)
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'Test123!'
    });
    
    if (response.data.token) {
      userToken = response.data.token;
      userId = response.data.user.id;
      logSuccess('User logged in');
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error) {
    if (error.response?.status === 401) {
      logWarning('Test user does not exist - this is expected for first run');
      throw new Error('Test user not found - registration test should create one');
    }
    throw error;
  }
}

// Flow 3: Get Merchants
async function testGetMerchants() {
  const response = await axios.get(`${API_BASE}/merchants`);
  if (response.data.length > 0) {
    merchantId = response.data[0].id;
    logSuccess(`Found ${response.data.length} merchants`);
  } else {
    logWarning('No merchants found - create some via admin');
  }
}

// Flow 4: Get Offers
async function testGetOffers() {
  const response = await axios.get(`${API_BASE}/offers`);
  if (response.data.length > 0) {
    offerId = response.data[0].id;
    logSuccess(`Found ${response.data.length} offers`);
  } else {
    logWarning('No offers found - create some via admin');
  }
}

// Flow 5: Track Cashback
async function testTrackCashback() {
  if (!offerId) {
    throw new Error('No offer ID available - create offers via admin first');
  }
  
  if (!userToken) {
    throw new Error('User not authenticated');
  }
  
  const response = await axios.post(
    `${API_BASE}/cashback/track`,
    {
      offer_id: offerId,
      amount: 100
    },
    {
      headers: { Authorization: `Bearer ${userToken}` }
    }
  );
  
  if (response.data.cashback_amount !== undefined) {
    logSuccess(`Cashback tracked: $${response.data.cashback_amount}`);
  } else {
    throw new Error('Cashback tracking failed - no cashback_amount in response');
  }
}

// Flow 6: Get User Dashboard
async function testGetDashboard() {
  const response = await axios.get(`${API_BASE}/cashback/summary`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  
  if (response.data) {
    logSuccess(`Total earnings: $${response.data.total_earnings}`);
  } else {
    throw new Error('Failed to get dashboard');
  }
}

// Flow 7: Request Withdrawal
async function testRequestWithdrawal() {
  if (!userToken) {
    throw new Error('User not authenticated');
  }
  
  // First check if user has enough balance
  try {
    const balanceResponse = await axios.get(`${API_BASE}/cashback/summary`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    const totalEarnings = balanceResponse.data?.total_earnings || 0;
    if (totalEarnings < 10) {
      logWarning(`User balance ($${totalEarnings}) is below minimum withdrawal ($10)`);
      logWarning('Skipping withdrawal test - user needs to earn more first');
      return; // Skip this test but don't fail
    }
  } catch (error) {
    logWarning('Could not check balance, attempting withdrawal anyway');
  }
  
  try {
    const response = await axios.post(
      `${API_BASE}/withdrawals/request`,
      {
        amount: 10,
        payment_method: 'paypal',
        payment_details: 'test@example.com'
      },
      {
        headers: { Authorization: `Bearer ${userToken}` }
      }
    );
    
    if (response.data.id) {
      logSuccess(`Withdrawal requested: $${response.data.amount}`);
    } else {
      throw new Error('Withdrawal request failed - no ID in response');
    }
  } catch (error) {
    if (error.response?.status === 400) {
      const errorMsg = error.response.data?.error || 'Bad request';
      if (errorMsg.includes('balance') || errorMsg.includes('minimum')) {
        logWarning('Withdrawal test skipped - insufficient balance or below minimum');
        return; // Skip but don't fail
      }
    }
    throw error;
  }
}

// Flow 8: Admin Login
async function testAdminLogin() {
  const response = await axios.post(`${API_BASE}/admin/auth/login`, {
    email: 'admin@cashback.com',
    password: 'admin123'
  });
  
  if (response.data.token) {
    adminToken = response.data.token;
    logSuccess('Admin logged in');
  } else {
    throw new Error('Admin login failed');
  }
}

// Flow 9: Get Admin Dashboard
async function testAdminDashboard() {
  const response = await axios.get(`${API_BASE}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  
  if (response.data) {
    logSuccess('Admin dashboard loaded');
  } else {
    throw new Error('Failed to load admin dashboard');
  }
}

// Flow 10: Health Check (with DB check)
async function testHealthCheck() {
  const response = await axios.get(`${API_BASE}/health`);
  if (response.data && (response.data.status === 'ok' || response.data.message)) {
    logSuccess('API is healthy');
    if (response.data.database === 'connected') {
      logSuccess('Database is connected');
    }
    return true;
  } else {
    throw new Error('Health check failed - unexpected response');
  }
}

// Flow 11: Public stats (no auth)
async function testGetStats() {
  const response = await axios.get(`${API_BASE}/stats`);
  const data = response.data;
  if (data && typeof data.total_users === 'number' && typeof data.total_cashback_paid === 'number') {
    logSuccess(`Stats: ${data.total_users} users, $${data.total_cashback_paid} cashback paid`);
    return true;
  }
  throw new Error('Stats endpoint failed - unexpected response');
}

// Flow 12: Merchant reviews (GET public, POST validation)
async function testMerchantReviews() {
  const merchantsRes = await axios.get(`${API_BASE}/merchants`, { params: { limit: 1 } });
  const merchants = merchantsRes.data?.data || merchantsRes.data;
  const list = Array.isArray(merchants) ? merchants : (merchants || []);
  if (list.length === 0) {
    logWarning('Skipping merchant reviews - no merchants');
    return true;
  }
  const mid = list[0].id;
  const getRes = await axios.get(`${API_BASE}/merchants/${mid}/reviews`);
  if (!getRes.data || typeof getRes.data.total_count !== 'number') {
    throw new Error('GET merchant reviews failed');
  }
  logSuccess('GET merchant reviews OK');
  // POST without auth or with invalid rating should fail
  try {
    await axios.post(`${API_BASE}/merchants/${mid}/reviews`, { rating: 10, comment: 'x' });
    logWarning('POST review with invalid rating should have returned 400');
  } catch (err) {
    if (err.response && (err.response.status === 400 || err.response.status === 401)) {
      logSuccess('Review validation / auth OK');
    }
  }
  return true;
}

// Run all tests
async function runTests() {
  logInfo('🚀 Starting Critical User Flow Tests\n');
  logInfo('Make sure the backend server is running on http://localhost:3001\n');
  
  // First check if server is running
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 2000 });
    logSuccess('Backend server is running');
  } catch (error) {
    logError('Backend server is NOT running!');
    logError('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  const results = [];
  
  // Public endpoints
  results.push(await testFlow('Health Check', testHealthCheck));
  results.push(await testFlow('Get Stats', testGetStats));
  results.push(await testFlow('Get Merchants', testGetMerchants));
  results.push(await testFlow('Get Offers', testGetOffers));
  results.push(await testFlow('Merchant Reviews', testMerchantReviews));
  
  // User flows
  results.push(await testFlow('User Registration', testUserRegistration));
  if (userToken) {
    results.push(await testFlow('Get Dashboard', testGetDashboard));
    if (offerId) {
      results.push(await testFlow('Track Cashback', testTrackCashback));
    } else {
      logWarning('Skipping Track Cashback - no offers available');
    }
    results.push(await testFlow('Request Withdrawal', testRequestWithdrawal));
  } else {
    logWarning('Skipping authenticated user tests - registration/login failed');
  }
  
  // Admin flows
  results.push(await testFlow('Admin Login', testAdminLogin));
  if (adminToken) {
    results.push(await testFlow('Admin Dashboard', testAdminDashboard));
  } else {
    logWarning('Skipping admin tests - admin login failed');
  }
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  logInfo(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    logSuccess('🎉 All tests passed!');
    process.exit(0);
  } else {
    logError(`⚠️  ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().catch(error => {
    logError('Test suite failed');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };
