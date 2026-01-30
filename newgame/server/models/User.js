const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['player', 'admin'],
    default: 'player'
  },
  balance: {
    type: Number,
    default: 1000
  },
  totalWinnings: {
    type: Number,
    default: 0
  },
  totalBets: {
    type: Number,
    default: 0
  },
  welcomeBonusReceived: {
    type: Boolean,
    default: false
  },
  lastDailyLoginBonus: {
    type: Date,
    default: null
  },
  gamesPlayed: {
    // Original games
    slots: { type: Number, default: 0 },
    blackjack: { type: Number, default: 0 },
    poker: { type: Number, default: 0 },
    bingo: { type: Number, default: 0 },
    roulette: { type: Number, default: 0 },
    wheel: { type: Number, default: 0 },
    craps: { type: Number, default: 0 },
    keno: { type: Number, default: 0 },
    scratch: { type: Number, default: 0 },
    // Card Games
    texasholdem: { type: Number, default: 0 },
    threecardpoker: { type: Number, default: 0 },
    caribbeanstud: { type: Number, default: 0 },
    paigow: { type: Number, default: 0 },
    letitride: { type: Number, default: 0 },
    casinowar: { type: Number, default: 0 },
    reddog: { type: Number, default: 0 },
    baccarat: { type: Number, default: 0 },
    spanish21: { type: Number, default: 0 },
    pontoon: { type: Number, default: 0 },
    doubleexposure: { type: Number, default: 0 },
    perfectpairs: { type: Number, default: 0 },
    // Dice & Number Games
    sicbo: { type: Number, default: 0 },
    dragontiger: { type: Number, default: 0 },
    bigsmall: { type: Number, default: 0 },
    hilo: { type: Number, default: 0 },
    lucky7: { type: Number, default: 0 },
    diceduel: { type: Number, default: 0 },
    numbermatch: { type: Number, default: 0 },
    quickdraw: { type: Number, default: 0 },
    numberwheel: { type: Number, default: 0 },
    // Wheel Games
    moneywheel: { type: Number, default: 0 },
    bigsix: { type: Number, default: 0 },
    colorwheel: { type: Number, default: 0 },
    multiplierwheel: { type: Number, default: 0 },
    bonuswheel: { type: Number, default: 0 },
    fortunewheel: { type: Number, default: 0 },
    // Lottery Games
    lotterydraw: { type: Number, default: 0 },
    pick3: { type: Number, default: 0 },
    pick5: { type: Number, default: 0 },
    numberball: { type: Number, default: 0 },
    luckynumbers: { type: Number, default: 0 },
    // Instant Win
    instantwin: { type: Number, default: 0 },
    match3: { type: Number, default: 0 },
    coinflip: { type: Number, default: 0 },
    quickwin: { type: Number, default: 0 },
    // Slot Variants
    classicslots: { type: Number, default: 0 },
    fruitslots: { type: Number, default: 0 },
    diamondslots: { type: Number, default: 0 },
    progressiveslots: { type: Number, default: 0 },
    multilineslots: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes for better query performance
userSchema.index({ role: 1, totalWinnings: -1 });
userSchema.index({ role: 1, totalBets: -1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);

