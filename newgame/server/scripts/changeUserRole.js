const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function changeUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('\nUsage: node changeUserRole.js <email> <role>');
      console.log('Example: node changeUserRole.js user@example.com admin');
      console.log('Roles: player, admin\n');
      process.exit(1);
    }

    const email = args[0];
    const role = args[1].toLowerCase();

    if (!['player', 'admin'].includes(role)) {
      console.error('Error: Role must be either "player" or "admin"');
      process.exit(1);
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { email: email },
      { role: role },
      { new: true }
    );

    if (!user) {
      console.error(`Error: User with email "${email}" not found`);
      process.exit(1);
    }

    console.log(`\n✅ Successfully updated user role!`);
    console.log(`Email: ${user.email}`);
    console.log(`Username: ${user.username}`);
    console.log(`New Role: ${user.role}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

changeUserRole();

