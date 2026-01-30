require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const email = process.argv[2] || 'player@test.com';
    const password = process.argv[3] || 'player123';
    const username = process.argv[4] || 'player';

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log(`❌ User already exists:`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Username: ${existingUser.username}`);
      console.log(`\nYou can log in with this account.`);
      process.exit(0);
    }

    // Create user
    const user = new User({
      username,
      email,
      password, // Will be hashed automatically by the pre-save hook
      balance: 1000,
      role: 'player'
    });

    await user.save();
    console.log('✅ Test user created successfully!\n');
    console.log('Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Username: ${username}`);
    console.log(`   Balance: $${user.balance}`);
    console.log(`   Role: ${user.role}\n`);
    console.log('You can now log in at http://localhost:3000');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
}

createTestUser();

