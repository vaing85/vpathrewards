const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Achievement = require('../models/Achievement');

dotenv.config();

const achievements = [
  // Games Played Achievements
  {
    code: 'FIRST_GAME',
    name: 'First Steps',
    description: 'Play your first game',
    category: 'games',
    icon: '🎮',
    requirement: { type: 'games_played', value: 1 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'GAMES_10',
    name: 'Getting Started',
    description: 'Play 10 games',
    category: 'games',
    icon: '🎯',
    requirement: { type: 'games_played', value: 10 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'GAMES_50',
    name: 'Regular Player',
    description: 'Play 50 games',
    category: 'games',
    icon: '🎲',
    requirement: { type: 'games_played', value: 50 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'uncommon'
  },
  {
    code: 'GAMES_100',
    name: 'Dedicated Gamer',
    description: 'Play 100 games',
    category: 'games',
    icon: '🏅',
    requirement: { type: 'games_played', value: 100 },
    reward: { type: 'bonus', amount: 50 },
    rarity: 'uncommon'
  },
  {
    code: 'GAMES_500',
    name: 'Veteran Player',
    description: 'Play 500 games',
    category: 'games',
    icon: '⭐',
    requirement: { type: 'games_played', value: 500 },
    reward: { type: 'bonus', amount: 200 },
    rarity: 'rare'
  },
  {
    code: 'GAMES_1000',
    name: 'Master Gamer',
    description: 'Play 1,000 games',
    category: 'games',
    icon: '👑',
    requirement: { type: 'games_played', value: 1000 },
    reward: { type: 'bonus', amount: 500 },
    rarity: 'epic'
  },
  {
    code: 'GAMES_5000',
    name: 'Legendary Player',
    description: 'Play 5,000 games',
    category: 'games',
    icon: '💎',
    requirement: { type: 'games_played', value: 5000 },
    reward: { type: 'bonus', amount: 2000 },
    rarity: 'legendary'
  },

  // Winnings Achievements
  {
    code: 'FIRST_WIN',
    name: 'First Victory',
    description: 'Win your first game',
    category: 'winnings',
    icon: '🎉',
    requirement: { type: 'games_won', value: 1 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'WIN_10',
    name: 'Lucky Streak',
    description: 'Win 10 games',
    category: 'winnings',
    icon: '🍀',
    requirement: { type: 'games_won', value: 10 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'WIN_50',
    name: 'Winner',
    description: 'Win 50 games',
    category: 'winnings',
    icon: '🏆',
    requirement: { type: 'games_won', value: 50 },
    reward: { type: 'bonus', amount: 100 },
    rarity: 'uncommon'
  },
  {
    code: 'WIN_100',
    name: 'Champion',
    description: 'Win 100 games',
    category: 'winnings',
    icon: '🥇',
    requirement: { type: 'games_won', value: 100 },
    reward: { type: 'bonus', amount: 250 },
    rarity: 'rare'
  },
  {
    code: 'TOTAL_WIN_100',
    name: 'Small Winner',
    description: 'Win a total of $100',
    category: 'winnings',
    icon: '💰',
    requirement: { type: 'total_winnings', value: 100 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'TOTAL_WIN_1000',
    name: 'Big Winner',
    description: 'Win a total of $1,000',
    category: 'winnings',
    icon: '💵',
    requirement: { type: 'total_winnings', value: 1000 },
    reward: { type: 'bonus', amount: 100 },
    rarity: 'uncommon'
  },
  {
    code: 'TOTAL_WIN_10000',
    name: 'Mega Winner',
    description: 'Win a total of $10,000',
    category: 'winnings',
    icon: '💸',
    requirement: { type: 'total_winnings', value: 10000 },
    reward: { type: 'bonus', amount: 500 },
    rarity: 'rare'
  },
  {
    code: 'TOTAL_WIN_100000',
    name: 'Ultra Winner',
    description: 'Win a total of $100,000',
    category: 'winnings',
    icon: '💎',
    requirement: { type: 'total_winnings', value: 100000 },
    reward: { type: 'bonus', amount: 2000 },
    rarity: 'epic'
  },

  // Biggest Win Achievements
  {
    code: 'BIG_WIN_100',
    name: 'Nice Win',
    description: 'Win $100 in a single game',
    category: 'winnings',
    icon: '🎁',
    requirement: { type: 'biggest_win', value: 100 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'BIG_WIN_500',
    name: 'Big Win',
    description: 'Win $500 in a single game',
    category: 'winnings',
    icon: '🎊',
    requirement: { type: 'biggest_win', value: 500 },
    reward: { type: 'bonus', amount: 50 },
    rarity: 'uncommon'
  },
  {
    code: 'BIG_WIN_1000',
    name: 'Huge Win',
    description: 'Win $1,000 in a single game',
    category: 'winnings',
    icon: '💥',
    requirement: { type: 'biggest_win', value: 1000 },
    reward: { type: 'bonus', amount: 100 },
    rarity: 'rare'
  },
  {
    code: 'BIG_WIN_5000',
    name: 'Mega Win',
    description: 'Win $5,000 in a single game',
    category: 'winnings',
    icon: '🚀',
    requirement: { type: 'biggest_win', value: 5000 },
    reward: { type: 'bonus', amount: 500 },
    rarity: 'epic'
  },
  {
    code: 'BIG_WIN_10000',
    name: 'Jackpot',
    description: 'Win $10,000 in a single game',
    category: 'winnings',
    icon: '🎰',
    requirement: { type: 'biggest_win', value: 10000 },
    reward: { type: 'bonus', amount: 1000 },
    rarity: 'legendary'
  },

  // Streak Achievements
  {
    code: 'STREAK_3',
    name: 'Hot Streak',
    description: 'Win 3 games in a row',
    category: 'streaks',
    icon: '🔥',
    requirement: { type: 'win_streak', value: 3 },
    reward: { type: 'bonus', amount: 25 },
    rarity: 'uncommon'
  },
  {
    code: 'STREAK_5',
    name: 'On Fire',
    description: 'Win 5 games in a row',
    category: 'streaks',
    icon: '🔥🔥',
    requirement: { type: 'win_streak', value: 5 },
    reward: { type: 'bonus', amount: 50 },
    rarity: 'rare'
  },
  {
    code: 'STREAK_10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    category: 'streaks',
    icon: '🔥🔥🔥',
    requirement: { type: 'win_streak', value: 10 },
    reward: { type: 'bonus', amount: 200 },
    rarity: 'epic'
  },

  // Balance Achievements
  {
    code: 'BALANCE_5000',
    name: 'Wealthy',
    description: 'Reach a balance of $5,000',
    category: 'milestones',
    icon: '💼',
    requirement: { type: 'balance', value: 5000 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'uncommon'
  },
  {
    code: 'BALANCE_10000',
    name: 'Rich',
    description: 'Reach a balance of $10,000',
    category: 'milestones',
    icon: '🏦',
    requirement: { type: 'balance', value: 10000 },
    reward: { type: 'bonus', amount: 100 },
    rarity: 'rare'
  },
  {
    code: 'BALANCE_50000',
    name: 'Millionaire',
    description: 'Reach a balance of $50,000',
    category: 'milestones',
    icon: '💎',
    requirement: { type: 'balance', value: 50000 },
    reward: { type: 'bonus', amount: 500 },
    rarity: 'epic'
  },

  // Game-Specific Achievements (Slots)
  {
    code: 'SLOTS_10',
    name: 'Slot Enthusiast',
    description: 'Play 10 games of Slots',
    category: 'games',
    icon: '🎰',
    requirement: { type: 'game_specific', value: 10, game: 'slots' },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'SLOTS_50',
    name: 'Slot Master',
    description: 'Play 50 games of Slots',
    category: 'games',
    icon: '🎰🎰',
    requirement: { type: 'game_specific', value: 50, game: 'slots' },
    reward: { type: 'bonus', amount: 50 },
    rarity: 'uncommon'
  },
  {
    code: 'BLACKJACK_10',
    name: 'Card Shark',
    description: 'Play 10 games of Blackjack',
    category: 'games',
    icon: '🃏',
    requirement: { type: 'game_specific', value: 10, game: 'blackjack' },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },
  {
    code: 'ROULETTE_10',
    name: 'Roulette Pro',
    description: 'Play 10 games of Roulette',
    category: 'games',
    icon: '🎡',
    requirement: { type: 'game_specific', value: 10, game: 'roulette' },
    reward: { type: 'badge', amount: 0 },
    rarity: 'common'
  },

  // Total Bets Achievement
  {
    code: 'BETS_1000',
    name: 'High Roller',
    description: 'Place $1,000 in total bets',
    category: 'milestones',
    icon: '🎲',
    requirement: { type: 'total_bets', value: 1000 },
    reward: { type: 'badge', amount: 0 },
    rarity: 'uncommon'
  },
  {
    code: 'BETS_10000',
    name: 'Whale',
    description: 'Place $10,000 in total bets',
    category: 'milestones',
    icon: '🐋',
    requirement: { type: 'total_bets', value: 10000 },
    reward: { type: 'bonus', amount: 200 },
    rarity: 'rare'
  }
];

async function seedAchievements() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing achievements (optional - comment out if you want to keep existing)
    // await Achievement.deleteMany({});
    // console.log('Cleared existing achievements');

    // Insert achievements
    for (const achievement of achievements) {
      await Achievement.findOneAndUpdate(
        { code: achievement.code },
        achievement,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Seeded ${achievements.length} achievements`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();

