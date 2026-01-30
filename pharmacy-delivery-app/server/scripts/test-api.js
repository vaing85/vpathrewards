const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

let customerToken = '';
let adminToken = '';
let driverToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`→ ${message}`, 'cyan');
}

async function testEndpoint(name, method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('PHARMACY DELIVERY APP - API TEST SUITE', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Get Products (Public)
  logInfo('Test 1: Get Products (Public Endpoint)');
  const productsTest = await testEndpoint('Get Products', 'GET', '/products');
  if (productsTest.success && productsTest.data.length > 0) {
    logSuccess(`Found ${productsTest.data.length} products`);
    passed++;
  } else {
    logError(`Failed: ${productsTest.error}`);
    failed++;
  }

  // Test 2: Customer Login
  logInfo('\nTest 2: Customer Login');
  const customerLogin = await testEndpoint('Customer Login', 'POST', '/auth/login', {
    email: 'customer@test.com',
    password: 'password123'
  });
  if (customerLogin.success && customerLogin.data.token) {
    customerToken = customerLogin.data.token;
    logSuccess('Customer logged in successfully');
    passed++;
  } else {
    logError(`Failed: ${customerLogin.error}`);
    failed++;
  }

  // Test 3: Admin Login
  logInfo('\nTest 3: Admin Login');
  const adminLogin = await testEndpoint('Admin Login', 'POST', '/auth/login', {
    email: 'admin@test.com',
    password: 'admin123'
  });
  if (adminLogin.success && adminLogin.data.token) {
    adminToken = adminLogin.data.token;
    logSuccess('Admin logged in successfully');
    passed++;
  } else {
    logError(`Failed: ${adminLogin.error}`);
    failed++;
  }

  // Test 4: Driver Login
  logInfo('\nTest 4: Driver Login');
  const driverLogin = await testEndpoint('Driver Login', 'POST', '/auth/login', {
    email: 'driver@test.com',
    password: 'driver123'
  });
  if (driverLogin.success && driverLogin.data.token) {
    driverToken = driverLogin.data.token;
    logSuccess('Driver logged in successfully');
    passed++;
  } else {
    logError(`Failed: ${driverLogin.error}`);
    failed++;
  }

  // Test 5: Get Current User (Customer)
  logInfo('\nTest 5: Get Current User (Customer)');
  const customerMe = await testEndpoint('Get Current User', 'GET', '/auth/me', null, customerToken);
  if (customerMe.success && customerMe.data.role === 'customer') {
    logSuccess(`Retrieved customer: ${customerMe.data.name}`);
    passed++;
  } else {
    logError(`Failed: ${customerMe.error}`);
    failed++;
  }

  // Test 6: Get Orders (Customer)
  logInfo('\nTest 6: Get Customer Orders');
  const customerOrders = await testEndpoint('Get Orders', 'GET', '/orders', null, customerToken);
  if (customerOrders.success) {
    logSuccess(`Customer has ${customerOrders.data.length} order(s)`);
    passed++;
  } else {
    logError(`Failed: ${customerOrders.error}`);
    failed++;
  }

  // Test 7: Get All Orders (Admin)
  logInfo('\nTest 7: Get All Orders (Admin)');
  const adminOrders = await testEndpoint('Get All Orders', 'GET', '/orders', null, adminToken);
  if (adminOrders.success) {
    logSuccess(`Admin can see ${adminOrders.data.length} order(s)`);
    passed++;
  } else {
    logError(`Failed: ${adminOrders.error}`);
    failed++;
  }

  // Test 8: Get Available Drivers (Admin)
  logInfo('\nTest 8: Get Available Drivers (Admin)');
  const drivers = await testEndpoint('Get Drivers', 'GET', '/users/drivers', null, adminToken);
  if (drivers.success) {
    logSuccess(`Found ${drivers.data.length} available driver(s)`);
    passed++;
  } else {
    logError(`Failed: ${drivers.error}`);
    failed++;
  }

  // Test 9: Get Deliveries (Driver)
  logInfo('\nTest 9: Get Driver Deliveries');
  const driverDeliveries = await testEndpoint('Get Deliveries', 'GET', '/deliveries', null, driverToken);
  if (driverDeliveries.success) {
    logSuccess(`Driver has ${driverDeliveries.data.length} delivery/ies`);
    passed++;
  } else {
    logError(`Failed: ${driverDeliveries.error}`);
    failed++;
  }

  // Test 10: Create Product (Admin)
  logInfo('\nTest 10: Create Product (Admin)');
  const newProduct = await testEndpoint('Create Product', 'POST', '/products', {
    name: 'Test Product',
    description: 'This is a test product',
    price: 9.99,
    stock: 50,
    category: 'other'
  }, adminToken);
  if (newProduct.success) {
    logSuccess(`Created product: ${newProduct.data.name}`);
    passed++;
  } else {
    logError(`Failed: ${newProduct.error}`);
    failed++;
  }

  // Test 11: Unauthorized Access (Customer trying to create product)
  logInfo('\nTest 11: Unauthorized Access Test');
  const unauthorized = await testEndpoint('Unauthorized Create Product', 'POST', '/products', {
    name: 'Unauthorized Product',
    description: 'Should fail',
    price: 10.00,
    stock: 10,
    category: 'other'
  }, customerToken);
  if (!unauthorized.success && unauthorized.status === 403) {
    logSuccess('Unauthorized access correctly blocked');
    passed++;
  } else {
    logError('Security issue: Unauthorized access not blocked');
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`\nTotal Tests: ${passed + failed}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('\n' + '='.repeat(60) + '\n', 'cyan');

  if (failed === 0) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please check the errors above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  process.exit(1);
});

