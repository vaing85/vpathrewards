const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  gameType: {
    type: String,
    required: true,
    enum: [
      'slots', 'blackjack', 'poker', 'bingo', 'roulette', 'wheel', 'craps', 'keno', 'scratch',
      'texasholdem', 'threecardpoker', 'caribbeanstud', 'paigow', 'letitride', 'casinowar',
      'reddog', 'baccarat', 'spanish21', 'pontoon', 'doubleexposure', 'perfectpairs',
      'sicbo', 'dragontiger', 'bigsmall', 'hilo', 'lucky7', 'diceduel', 'numbermatch',
      'quickdraw', 'numberwheel', 'moneywheel', 'bigsix', 'colorwheel', 'multiplierwheel',
      'bonuswheel', 'fortunewheel', 'lotterydraw', 'pick3', 'pick5', 'numberball',
      'luckynumbers', 'instantwin', 'match3', 'coinflip', 'quickwin', 'classicslots',
      'fruitslots', 'diamondslots', 'progressiveslots', 'multilineslots'
    ]
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  prizePool: {
    type: Number,
    default: 0,
    min: 0
  },
  maxParticipants: {
    type: Number,
    default: null // null = unlimited
  },
  minParticipants: {
    type: Number,
    default: 2
  },
  prizeDistribution: [{
    rank: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    fixedAmount: {
      type: Number,
      default: 0
    }
  }],
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      default: 0
    },
    gamesPlayed: {
      type: Number,
      default: 0
    },
    totalWinnings: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: null
    }
  }],
  leaderboard: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    score: Number,
    gamesPlayed: Number,
    totalWinnings: Number,
    rank: Number
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ gameType: 1, status: 1 });
tournamentSchema.index({ 'participants.userId': 1 });
tournamentSchema.index({ endDate: 1 });

// Method to calculate prize for a rank
tournamentSchema.methods.calculatePrize = function(rank) {
  const distribution = this.prizeDistribution.find(d => d.rank === rank);
  if (!distribution) return 0;
  
  const percentageAmount = (this.prizePool * distribution.percentage) / 100;
  return percentageAmount + distribution.fixedAmount;
};

// Method to update leaderboard
tournamentSchema.methods.updateLeaderboard = function() {
  this.leaderboard = this.participants
    .map(p => ({
      userId: p.userId,
      username: p.username || 'Unknown',
      score: p.score,
      gamesPlayed: p.gamesPlayed,
      totalWinnings: p.totalWinnings,
      rank: p.rank
    }))
    .sort((a, b) => {
      // Sort by score (desc), then by totalWinnings (desc)
      if (b.score !== a.score) return b.score - a.score;
      return b.totalWinnings - a.totalWinnings;
    })
    .map((p, index) => ({
      ...p,
      rank: index + 1
    }));
};

module.exports = mongoose.model('Tournament', tournamentSchema);

