require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';

async function addTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get or create a test user
    let testUser = await User.findOne({ email: 'testplayer@test.com' });
    if (!testUser) {
      testUser = new User({
        username: 'testplayer',
        email: 'testplayer@test.com',
        password: 'test123',
        balance: 5000,
        role: 'player'
      });
      await testUser.save();
      console.log('Created test user');
    }

    // Get or create another test user
    let testUser2 = await User.findOne({ email: 'testplayer2@test.com' });
    if (!testUser2) {
      testUser2 = new User({
        username: 'testplayer2',
        email: 'testplayer2@test.com',
        password: 'test123',
        balance: 3000,
        role: 'player'
      });
      await testUser2.save();
      console.log('Created test user 2');
    }

    // Clear existing test transactions for these users
    await Transaction.deleteMany({ 
      user: { $in: [testUser._id, testUser2._id] },
      description: { $regex: /^Test/ }
    });
    console.log('Cleared existing test transactions');

    const games = ['slots', 'blackjack', 'poker', 'roulette', 'bingo', 'craps', 'keno', 'scratch', 'wheel', 'texasholdem'];
    const users = [testUser, testUser2];

    // Generate transactions for the last 30 days
    const now = new Date();
    const transactions = [];

    for (let day = 0; day < 30; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      // Create 5-10 transactions per day
      const transactionsPerDay = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < transactionsPerDay; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const game = games[Math.floor(Math.random() * games.length)];
        const betAmount = Math.floor(Math.random() * 100) + 10; // $10-$110
        const winAmount = Math.random() > 0.6 ? Math.floor(Math.random() * betAmount * 2) : 0; // 40% win rate

        // Bet transaction
        const betTx = {
          user: user._id,
          type: 'bet',
          amount: betAmount,
          balanceBefore: user.balance,
          balanceAfter: user.balance - betAmount,
          status: 'completed',
          game: game,
          description: `Test ${game} bet of $${betAmount.toFixed(2)}`,
          metadata: { bet: betAmount, test: true },
          createdAt: new Date(date.getTime() + i * 60000) // Spread transactions throughout the day
        };
        transactions.push(betTx);

        // Win transaction if won
        if (winAmount > 0) {
          const winTx = {
            user: user._id,
            type: 'win',
            amount: winAmount,
            balanceBefore: user.balance - betAmount,
            balanceAfter: user.balance - betAmount + winAmount,
            status: 'completed',
            game: game,
            description: `Test ${game} win of $${winAmount.toFixed(2)}`,
            metadata: { bet: betAmount, win: winAmount, test: true },
            createdAt: new Date(date.getTime() + i * 60000 + 2000) // 2 seconds after bet
          };
          transactions.push(winTx);
        }
      }
    }

    // Insert all transactions
    await Transaction.insertMany(transactions);
    console.log(`Created ${transactions.length} test transactions`);

    // Update user stats
    for (const user of users) {
      const userBets = await Transaction.aggregate([
        { $match: { user: user._id, type: 'bet', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const userWins = await Transaction.aggregate([
        { $match: { user: user._id, type: 'win', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      user.totalBets = userBets[0]?.total || 0;
      user.totalWinnings = userWins[0]?.total || 0;
      await user.save();
    }

    console.log('Updated user statistics');
    console.log('Test data added successfully!');
    console.log('\nYou can now view the analytics in the admin dashboard.');
    console.log('Test users:');
    console.log(`  - ${testUser.email} (${testUser.username})`);
    console.log(`  - ${testUser2.email} (${testUser2.username})`);

    process.exit(0);
  } catch (error) {
    console.error('Error adding test data:', error);
    process.exit(1);
  }
}

addTestData();

