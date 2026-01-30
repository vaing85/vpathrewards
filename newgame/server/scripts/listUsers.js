const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function listUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all users
    const users = await User.find().select('username email role balance createdAt');

    if (users.length === 0) {
      console.log('No users found in database.\n');
      process.exit(0);
    }

    console.log('Users in database:');
    console.log('='.repeat(80));
    console.log(
      'Email'.padEnd(30) + 
      'Username'.padEnd(20) + 
      'Role'.padEnd(10) + 
      'Balance'.padEnd(10) + 
      'Created'
    );
    console.log('-'.repeat(80));

    users.forEach(user => {
      const date = new Date(user.createdAt).toLocaleDateString();
      console.log(
        user.email.padEnd(30) + 
        user.username.padEnd(20) + 
        user.role.padEnd(10) + 
        `$${user.balance}`.padEnd(10) + 
        date
      );
    });

    console.log('='.repeat(80));
    console.log(`\nTotal users: ${users.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listUsers();

