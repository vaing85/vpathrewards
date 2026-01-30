const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');
    console.log('Connection URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Collections:', await mongoose.connection.db.listCollections().toArray());
    
    // Check users collection
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    console.log(`\nUsers in 'users' collection: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find().select('username email role balance').limit(5);
      console.log('\nSample users:');
      users.forEach(u => {
        console.log(`  - ${u.email} (${u.username}) - ${u.role} - $${u.balance}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();

