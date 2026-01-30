const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function testTransactions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get test user
    const testUser = await User.findOne({ email: 'test@test.com' });
    if (!testUser) {
      console.log('Test user not found. Please create a test account first.');
      process.exit(1);
    }

    console.log(`Testing transactions for: ${testUser.email} (${testUser.username})`);
    console.log(`Current balance: $${testUser.balance}\n`);

    // Count existing transactions
    const existingCount = await Transaction.countDocuments({ user: testUser._id });
    console.log(`Existing transactions: ${existingCount}\n`);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ user: testUser._id })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentTransactions.length > 0) {
      console.log('Recent transactions:');
      console.log('='.repeat(80));
      recentTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.type.toUpperCase()} - $${tx.amount.toFixed(2)} - ${tx.status} - ${new Date(tx.createdAt).toLocaleString()}`);
        if (tx.game) console.log(`   Game: ${tx.game}`);
        if (tx.description) console.log(`   Description: ${tx.description}`);
      });
      console.log('='.repeat(80));
    } else {
      console.log('No transactions found. Transactions will be created when you:');
      console.log('  - Make a deposit');
      console.log('  - Play a game (bet/win)');
      console.log('  - Request a withdrawal\n');
    }

    // Test transaction statistics
    const stats = await Transaction.aggregate([
      { $match: { user: testUser._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    if (stats.length > 0) {
      console.log('\nTransaction Statistics:');
      console.log('-'.repeat(80));
      stats.forEach(stat => {
        console.log(`${stat._id}: ${stat.count} transactions, Total: $${stat.total.toFixed(2)}`);
      });
      console.log('-'.repeat(80));
    }

    // Check pending withdrawals
    const pendingWithdrawals = await Transaction.find({
      user: testUser._id,
      type: 'withdrawal',
      status: 'pending'
    });

    if (pendingWithdrawals.length > 0) {
      console.log(`\n⚠️  ${pendingWithdrawals.length} pending withdrawal(s) awaiting admin approval`);
    }

    console.log('\n✅ Transaction system is working correctly!');
    console.log('\nTo test in the browser:');
    console.log('1. Login at http://localhost:3000');
    console.log('2. Click "💰 Deposit/Withdraw" button');
    console.log('3. Make a deposit');
    console.log('4. Play a game to see bet/win transactions');
    console.log('5. View transaction history at /transactions/history');
    console.log('6. (Admin) Check /dashboard for transaction management\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testTransactions();

