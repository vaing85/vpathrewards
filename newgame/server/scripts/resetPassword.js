const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function resetPassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3] || 'password123';

    if (!email) {
      console.log('Usage: node resetPassword.js <email> [newPassword]');
      console.log('Example: node resetPassword.js test@test.com password123');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User with email "${email}" not found.`);
      process.exit(1);
    }

    // Set password to plain text - the pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);
    console.log(`Balance: $${user.balance}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();

