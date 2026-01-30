const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { createGameTransactions } = require('./games-transaction-helper');
const { gameRateLimiter } = require('../middleware/rateLimiter');
const { validateBetMiddleware } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorLogger');

const router = express.Router();

// Play Slots
router.post('/slots/play', auth, gameRateLimiter, validateBetMiddleware, asyncHandler(async (req, res) => {
  const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Generate random symbols
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    // Check for wins
    let win = 0;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Three of a kind
      const multiplier = symbols.indexOf(reels[0]) + 1;
      win = bet * multiplier * 2;
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // Two of a kind
      win = bet * 1.5;
    }

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'slots',
      bet,
      win,
      { reels }
    );

    // Update games played
    user.gamesPlayed.slots += 1;
    await user.save();

    res.json({
      reels,
      bet,
      win,
      balance
    });
}));

// Play Blackjack
router.post('/blackjack/play', auth, async (req, res) => {
  try {
    const { bet, action } = req.body; // action: 'hit', 'stand', 'deal'
    const user = await User.findById(req.user._id);

    if (action === 'deal') {
      if (bet > 100) {
        return res.status(400).json({ message: 'Maximum bet is $100' });
      }

      if (user.balance < bet) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Deal initial cards
      const deck = generateDeck();
      const playerHand = [drawCard(deck), drawCard(deck)];
      const dealerHand = [drawCard(deck), drawCard(deck)];

      user.balance -= bet;
      user.totalBets += bet;
      await user.save();

      return res.json({
        playerHand,
        dealerHand: [dealerHand[0], '?'], // Hide dealer's second card
        bet,
        balance: user.balance,
        gameState: 'playing'
      });
    }

    // Handle hit/stand logic
    res.json({ message: 'Game logic for hit/stand' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Play Bingo
router.post('/bingo/play', auth, async (req, res) => {
  try {
    const { bet, numCards = 1 } = req.body;
    const user = await User.findById(req.user._id);

    // Validate number of cards
    if (numCards < 1 || numCards > 4) {
      return res.status(400).json({ message: 'Number of cards must be between 1 and 4' });
    }

    const totalBet = bet * numCards;

    if (totalBet > 400) {
      return res.status(400).json({ message: 'Maximum total bet is $400 (4 cards × $100)' });
    }

    if (user.balance < totalBet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Generate multiple bingo cards
    const bingoCards = [];
    for (let i = 0; i < numCards; i++) {
      bingoCards.push(generateBingoCard());
    }
    const drawnNumbers = [];

    user.balance -= totalBet;
    user.totalBets += totalBet;
    user.gamesPlayed.bingo += 1;
    await user.save();

    res.json({
      bingoCards,
      bingoCard: bingoCards[0], // Keep for backward compatibility
      drawnNumbers,
      bet: totalBet,
      betPerCard: bet,
      numCards,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper functions (moved to games-utils.js, keeping for backward compatibility)
const { generateDeck, shuffleDeck, drawCard, getCardValue } = require('./games-utils');

function generateBingoCard() {
  const card = [];
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      if (i === 2 && j === 2) {
        row.push('FREE');
      } else {
        const min = j * 15 + 1;
        const max = (j + 1) * 15;
        row.push(Math.floor(Math.random() * (max - min + 1)) + min);
      }
    }
    card.push(row);
  }
  return card;
}

// Play Roulette
router.post('/roulette/play', auth, async (req, res) => {
  try {
    const { bet, betType, betValue } = req.body; // betType: 'number', 'color', 'evenodd', 'range'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Spin the wheel (0-36, 37 = 00)
    const winningNumber = Math.floor(Math.random() * 38);
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(winningNumber);
    const isBlack = winningNumber !== 0 && winningNumber !== 37 && !isRed;
    const isGreen = winningNumber === 0 || winningNumber === 37;
    const isEven = winningNumber !== 0 && winningNumber !== 37 && winningNumber % 2 === 0;
    const isOdd = winningNumber !== 0 && winningNumber !== 37 && winningNumber % 2 === 1;

    let win = 0;
    let won = false;

    if (betType === 'number') {
      if (winningNumber === parseInt(betValue)) {
        win = bet * 35; // 35:1 payout
        won = true;
      }
    } else if (betType === 'color') {
      if ((betValue === 'red' && isRed) || (betValue === 'black' && isBlack)) {
        win = bet * 2; // 2:1 payout
        won = true;
      }
    } else if (betType === 'evenodd') {
      if ((betValue === 'even' && isEven) || (betValue === 'odd' && isOdd)) {
        win = bet * 2; // 2:1 payout
        won = true;
      }
    } else if (betType === 'range') {
      if (betValue === '1-18' && winningNumber >= 1 && winningNumber <= 18) {
        win = bet * 2;
        won = true;
      } else if (betValue === '19-36' && winningNumber >= 19 && winningNumber <= 36) {
        win = bet * 2;
        won = true;
      }
    }

    // Update user balance
    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.roulette += 1;
    await user.save();

    res.json({
      winningNumber: winningNumber === 37 ? '00' : winningNumber,
      betType,
      betValue,
      bet,
      win,
      won,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Play Video Poker
router.post('/poker/play', auth, async (req, res) => {
  try {
    const { bet, action, hand, heldIndices } = req.body;
    const user = await User.findById(req.user._id);

    if (action === 'deal') {
      if (bet > 100) {
        return res.status(400).json({ message: 'Maximum bet is $100' });
      }

      if (user.balance < bet) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Deal 5 cards
      const deck = generateDeck();
      const newHand = [drawCard(deck), drawCard(deck), drawCard(deck), drawCard(deck), drawCard(deck)];

      user.balance -= bet;
      user.totalBets += bet;
      await user.save();

      return res.json({
        hand: newHand,
        bet,
        balance: user.balance,
        gameState: 'playing'
      });
    }

    if (action === 'draw') {
      // Replace cards that aren't held
      const deck = generateDeck();
      const finalHand = [...hand];
      
      // Remove held cards from deck
      const heldCards = heldIndices.map(i => hand[i]);
      for (let i = deck.length - 1; i >= 0; i--) {
        const card = deck[i];
        if (heldCards.some(hc => hc.rank === card.rank && hc.suit === card.suit)) {
          deck.splice(i, 1);
        }
      }
      
      for (let i = 0; i < 5; i++) {
        if (!heldIndices.includes(i)) {
          finalHand[i] = drawCard(deck);
        }
      }

      // Evaluate hand
      const evaluation = evaluatePokerHand(finalHand);
      const win = bet * evaluation.multiplier;

      // Update user balance
      user.balance += win;
      if (win > 0) {
        user.totalWinnings += win;
      }
      user.gamesPlayed.poker += 1;
      await user.save();

      return res.json({
        hand: finalHand,
        handName: evaluation.name,
        multiplier: evaluation.multiplier,
        bet,
        win,
        balance: user.balance
      });
    }

    res.json({ message: 'Invalid action' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function evaluatePokerHand(cards) {
  const getCardValue = (card) => {
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    return parseInt(card.rank);
  };

  const values = cards.map(c => getCardValue(c)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] - 1);
  const pairs = Object.values(counts).filter(c => c === 2).length;
  const threeOfAKind = Object.values(counts).some(c => c === 3);
  const fourOfAKind = Object.values(counts).some(c => c === 4);

  if (isFlush && isStraight && values[0] === 14) return { name: 'Royal Flush', multiplier: 250 };
  if (isFlush && isStraight) return { name: 'Straight Flush', multiplier: 50 };
  if (fourOfAKind) return { name: 'Four of a Kind', multiplier: 25 };
  if (threeOfAKind && pairs > 0) return { name: 'Full House', multiplier: 9 };
  if (isFlush) return { name: 'Flush', multiplier: 6 };
  if (isStraight) return { name: 'Straight', multiplier: 4 };
  if (threeOfAKind) return { name: 'Three of a Kind', multiplier: 3 };
  if (pairs === 2) return { name: 'Two Pair', multiplier: 2 };
  if (pairs === 1) return { name: 'Pair', multiplier: 1 };
  return { name: 'High Card', multiplier: 0 };
}

// Play Wheel of Fortune
router.post('/wheel/play', auth, async (req, res) => {
  try {
    const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Wheel segments with multipliers
    const wheelSegments = [
      { value: 1, multiplier: 2 },
      { value: 2, multiplier: 3 },
      { value: 5, multiplier: 5 },
      { value: 10, multiplier: 10 },
      { value: 20, multiplier: 20 },
      { value: 50, multiplier: 50 },
      { value: 100, multiplier: 100 },
      { value: 0, multiplier: 0 } // Lose
    ];

    const segment = wheelSegments[Math.floor(Math.random() * wheelSegments.length)];
    const win = bet * segment.multiplier;

    // Update user balance
    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.wheel += 1;
    await user.save();

    res.json({
      segment: segment.value,
      multiplier: segment.multiplier,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Play Craps
router.post('/craps/play', auth, async (req, res) => {
  try {
    const { bet, betType } = req.body; // betType: 'pass', 'dontpass', 'field', 'any7', 'any11'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Roll two dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const sum = die1 + die2;

    let win = 0;
    let won = false;

    if (betType === 'pass') {
      if (sum === 7 || sum === 11) {
        win = bet * 2;
        won = true;
      } else if (sum === 2 || sum === 3 || sum === 12) {
        won = false;
      } else {
        // Point established - simplified: 50% chance to win
        won = Math.random() > 0.5;
        if (won) win = bet * 2;
      }
    } else if (betType === 'dontpass') {
      if (sum === 2 || sum === 3) {
        win = bet * 2;
        won = true;
      } else if (sum === 7 || sum === 11) {
        won = false;
      } else {
        won = Math.random() > 0.5;
        if (won) win = bet * 2;
      }
    } else if (betType === 'field') {
      if ([2, 3, 4, 9, 10, 11, 12].includes(sum)) {
        if (sum === 2 || sum === 12) {
          win = bet * 3;
        } else {
          win = bet * 2;
        }
        won = true;
      }
    } else if (betType === 'any7') {
      if (sum === 7) {
        win = bet * 5;
        won = true;
      }
    } else if (betType === 'any11') {
      if (sum === 11) {
        win = bet * 15;
        won = true;
      }
    }

    // Update user balance
    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.craps += 1;
    await user.save();

    res.json({
      die1,
      die2,
      sum,
      betType,
      bet,
      win,
      won,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Play Keno
router.post('/keno/play', auth, async (req, res) => {
  try {
    const { bet, selectedNumbers } = req.body; // selectedNumbers: array of 1-10 numbers (1-80)
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!selectedNumbers || selectedNumbers.length < 1 || selectedNumbers.length > 10) {
      return res.status(400).json({ message: 'Select 1-10 numbers' });
    }

    // Draw 20 winning numbers
    const winningNumbers = [];
    while (winningNumbers.length < 20) {
      const num = Math.floor(Math.random() * 80) + 1;
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    winningNumbers.sort((a, b) => a - b);

    // Count matches
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num)).length;
    
    // Payout based on matches (simplified payout table)
    const payoutTable = {
      1: { 1: 3 },
      2: { 2: 12 },
      3: { 2: 1, 3: 42 },
      4: { 2: 1, 3: 3, 4: 100 },
      5: { 3: 2, 4: 12, 5: 800 },
      6: { 3: 1, 4: 4, 5: 90, 6: 1500 },
      7: { 4: 2, 5: 15, 6: 100, 7: 5000 },
      8: { 5: 5, 6: 30, 7: 300, 8: 10000 },
      9: { 6: 10, 7: 50, 8: 1000, 9: 25000 },
      10: { 5: 2, 6: 5, 7: 25, 8: 200, 9: 2000, 10: 100000 }
    };

    const win = payoutTable[selectedNumbers.length]?.[matches] ? 
                bet * payoutTable[selectedNumbers.length][matches] : 0;

    // Update user balance
    const balanceBefore = user.balance;
    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.keno += 1;
    await user.save();

    // Create bet transaction
    const betTransaction = new Transaction({
      user: req.user._id,
      type: 'bet',
      amount: bet,
      balanceBefore,
      balanceAfter: balanceBefore - bet,
      status: 'completed',
      game: 'keno',
      description: `Keno bet of $${bet.toFixed(2)}`,
      metadata: { selectedNumbers: selectedNumbers.sort((a, b) => a - b), winningNumbers, matches }
    });
    await betTransaction.save();

    // Create win transaction if won
    if (win > 0) {
      const winTransaction = new Transaction({
        user: req.user._id,
        type: 'win',
        amount: win,
        balanceBefore: balanceBefore - bet,
        balanceAfter: user.balance,
        status: 'completed',
        game: 'keno',
        description: `Keno win of $${win.toFixed(2)}`,
        metadata: { selectedNumbers: selectedNumbers.sort((a, b) => a - b), winningNumbers, matches, bet }
      });
      await winTransaction.save();
    }

    res.json({
      selectedNumbers: selectedNumbers.sort((a, b) => a - b),
      winningNumbers,
      matches,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Play Scratch Cards
router.post('/scratch/play', auth, async (req, res) => {
  try {
    const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Generate 9 scratch card positions (3x3 grid)
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣', '🎁'];
    let card = [];
    const winMultipliers = {
      'three_match': 10,
      'two_match': 2,
      'special': 50
    };

    // Generate card with win potential
    const hasWin = Math.random() > 0.6; // 40% win chance
    let win = 0;
    let matchType = null;

    if (hasWin) {
      const winType = Math.random();
      if (winType > 0.8) {
        // Three of a kind
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        card = [symbol, symbol, symbol, 
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)],
                symbols[Math.floor(Math.random() * symbols.length)]];
        // Shuffle
        for (let i = card.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [card[i], card[j]] = [card[j], card[i]];
        }
        win = bet * winMultipliers.three_match;
        matchType = 'three_match';
      } else if (winType > 0.5) {
        // Two of a kind
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        const pos1 = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
        const pos2 = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
        card = new Array(9).fill(null).map((_, i) => {
          if (i === pos1 || i === pos2) return symbol;
          return symbols[Math.floor(Math.random() * symbols.length)];
        });
        win = bet * winMultipliers.two_match;
        matchType = 'two_match';
      } else {
        // Special symbol (💎 or 7️⃣)
        const specialSymbol = Math.random() > 0.5 ? '💎' : '7️⃣';
        card = new Array(9).fill(null).map(() => 
          Math.random() > 0.3 ? specialSymbol : symbols[Math.floor(Math.random() * symbols.length)]
        );
        const specialCount = card.filter(s => s === specialSymbol).length;
        if (specialCount >= 3) {
          win = bet * winMultipliers.special;
          matchType = 'special';
        } else {
          win = bet * 2;
          matchType = 'two_match';
        }
      }
    } else {
      // No win - random symbols
      card = new Array(9).fill(null).map(() => 
        symbols[Math.floor(Math.random() * symbols.length)]
      );
    }

    // Update user balance and create transactions
    const { createGameTransactions } = require('./games-transaction-helper');
    const { balance } = await createGameTransactions(
      req.user._id,
      'scratch',
      bet,
      win,
      { matchType, card }
    );

    // Update games played
    const updatedUser = await User.findById(req.user._id);
    if (updatedUser.gamesPlayed && updatedUser.gamesPlayed.scratch !== undefined) {
      updatedUser.gamesPlayed.scratch += 1;
    } else {
      if (!updatedUser.gamesPlayed) {
        updatedUser.gamesPlayed = {};
      }
      updatedUser.gamesPlayed.scratch = 1;
    }
    await updatedUser.save();

    res.json({
      card,
      bet,
      win,
      matchType,
      balance: balance
    });
  } catch (error) {
    console.error('Scratch game error:', error);
    res.status(500).json({ message: error.message || 'Error playing scratch game' });
  }
});

// Get game history
router.get('/history', auth, async (req, res) => {
  try {
    const { game, result, startDate, endDate, limit = 50, page = 1 } = req.query;
    const userId = req.user._id;

    // Build query for bet transactions (these represent game sessions)
    const query = {
      user: userId,
      type: 'bet',
      game: { $exists: true, $ne: null } // Only game-related bets
    };

    if (game) query.game = game;

    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get bet transactions
    const betTransactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments(query);

    // If no bet transactions, return early
    if (betTransactions.length === 0) {
      return res.json({
        history: [],
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      });
    }

    // Calculate time range for all bets (10 seconds before earliest to 10 seconds after latest)
    const betTimes = betTransactions.map(tx => tx.createdAt.getTime());
    const earliestBet = Math.min(...betTimes) - 10000;
    const latestBet = Math.max(...betTimes) + 10000;

    // Build game filter for win transactions
    const games = [...new Set(betTransactions.map(tx => tx.game))];
    const betAmounts = [...new Set(betTransactions.map(tx => tx.amount))];

    // Fetch all matching win transactions in a single query
    const winQuery = {
      user: userId,
      type: 'win',
      game: { $in: games },
      createdAt: {
        $gte: new Date(earliestBet),
        $lte: new Date(latestBet)
      },
      $or: [
        { 'metadata.bet': { $in: betAmounts } },
        { 'metadata.bet': { $exists: false } } // Fallback for older transactions
      ]
    };

    const winTransactions = await Transaction.find(winQuery)
      .sort({ createdAt: 1 })
      .lean();

    // Create a map for fast win transaction lookup
    // Key: `${game}_${betAmount}_${timestampRange}`
    const winMap = new Map();
    winTransactions.forEach(winTx => {
      const betAmount = winTx.metadata?.bet;
      const game = winTx.game;
      const winTime = winTx.createdAt.getTime();
      
      // For each bet transaction, check if this win matches
      betTransactions.forEach(betTx => {
        if (betTx.game === game) {
          const betTime = betTx.createdAt.getTime();
          const timeDiff = Math.abs(winTime - betTime);
          
          // Match if within 10 seconds and (bet amount matches or no bet amount in metadata)
          if (timeDiff <= 10000 && (!betAmount || betAmount === betTx.amount)) {
            const key = betTx._id.toString();
            if (!winMap.has(key) || timeDiff < Math.abs(winMap.get(key).createdAt.getTime() - betTime)) {
              winMap.set(key, winTx);
            }
          }
        }
      });
    });

    // Build game history by matching bets with wins
    const gameHistory = betTransactions
      .map((betTx) => {
        const winTx = winMap.get(betTx._id.toString());
        const winAmount = winTx ? winTx.amount : 0;
        const netResult = winAmount - betTx.amount;
        const resultType = winAmount > 0 ? 'win' : 'loss';

        // Apply result filter if specified
        if (result && result !== resultType) {
          return null;
        }

        return {
          id: betTx._id,
          game: betTx.game,
          bet: betTx.amount,
          win: winAmount,
          net: netResult,
          result: resultType,
          balanceBefore: betTx.balanceBefore,
          balanceAfter: winTx ? winTx.balanceAfter : betTx.balanceAfter,
          timestamp: betTx.createdAt,
          metadata: {
            ...betTx.metadata,
            ...(winTx && winTx.metadata)
          }
        };
      })
      .filter(item => item !== null);

    res.json({
      history: gameHistory,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent Keno draws (public endpoint for draw chart)
router.get('/keno/draws', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent Keno transactions with winning numbers
    const draws = await Transaction.find({
      game: 'keno',
      type: 'bet',
      'metadata.winningNumbers': { $exists: true }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('metadata.winningNumbers createdAt')
    .lean();

    const formattedDraws = draws.map(draw => ({
      winningNumbers: draw.metadata.winningNumbers || [],
      timestamp: draw.createdAt
    }));

    res.json({ draws: formattedDraws });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

