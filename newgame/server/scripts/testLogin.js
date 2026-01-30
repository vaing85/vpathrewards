const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function testLogin() {
  try {
    const email = process.argv[2] || 'test@test.com';
    const password = process.argv[3] || 'admin123';

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User with email "${email}" not found.`);
      process.exit(1);
    }

    console.log(`Testing login for: ${email}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}\n`);

    // Test password
    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      console.log('✅ Password is correct!');
    } else {
      console.log('❌ Password is incorrect!');
    }

    process.exit(isMatch ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testLogin();

