const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { generateDeck, shuffleDeck, drawCard, getCardValue } = require('./games-utils');
const { createGameTransactions } = require('./games-transaction-helper');

const router = express.Router();

// Helper function for simple bet games
async function playSimpleGame(req, res, gameName, winChance, multipliers) {
  try {
    const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const random = Math.random();
    let win = 0;
    let result = null;

    if (random < winChance) {
      const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      win = bet * multiplier;
      result = { won: true, multiplier };
    } else {
      result = { won: false };
    }

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      gameName,
      bet,
      win,
      result
    );

    // Update games played
    if (user.gamesPlayed[gameName] !== undefined) {
      user.gamesPlayed[gameName] += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      ...result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Texas Hold'em
router.post('/texasholdem/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'texasholdem', 0.4, [1, 2, 3, 5, 10, 25]);
});

// Three Card Poker
router.post('/threecardpoker/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'threecardpoker', 0.4, [1, 2, 3, 5, 10, 25]);
});

// Caribbean Stud Poker
router.post('/caribbeanstud/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'caribbeanstud', 0.35, [1, 2, 5, 10, 20, 50]);
});

// Pai Gow Poker
router.post('/paigow/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'paigow', 0.45, [1, 2, 3, 4, 5]);
});

// Let It Ride
router.post('/letitride/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'letitride', 0.4, [1, 2, 5, 10, 20]);
});

// Casino War
router.post('/casinowar/play', auth, async (req, res) => {
  try {
    const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const deck = generateDeck();
    const playerCard = drawCard(deck);
    const dealerCard = drawCard(deck);

    let win = 0;
    const playerValue = getCardValue(playerCard.rank);
    const dealerValue = getCardValue(dealerCard.rank);

    if (playerValue > dealerValue) {
      win = bet * 2;
    } else if (playerValue === dealerValue) {
      // War - simplified: 50% chance to win
      win = Math.random() > 0.5 ? bet * 2 : 0;
    }

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'casinowar',
      bet,
      win,
      { playerCard, dealerCard }
    );

    // Update games played
    user.gamesPlayed.casinowar += 1;
    await user.save();

    res.json({
      playerCard,
      dealerCard,
      bet,
      win,
      balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Red Dog
router.post('/reddog/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'reddog', 0.4, [1, 2, 5, 11]);
});

// Baccarat
router.post('/baccarat/play', auth, async (req, res) => {
  try {
    const { bet, betOn } = req.body; // betOn: 'player', 'banker', 'tie'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const deck = generateDeck();
    const playerCards = [drawCard(deck), drawCard(deck)];
    const bankerCards = [drawCard(deck), drawCard(deck)];

    const getBaccaratValue = (card) => {
      const rank = card.rank;
      if (['J', 'Q', 'K'].includes(rank)) return 0;
      if (rank === 'A') return 1;
      if (rank === '10') return 0;
      return parseInt(rank);
    };

    const playerTotal = (getBaccaratValue(playerCards[0]) + getBaccaratValue(playerCards[1])) % 10;
    const bankerTotal = (getBaccaratValue(bankerCards[0]) + getBaccaratValue(bankerCards[1])) % 10;

    let win = 0;
    if (betOn === 'player' && playerTotal > bankerTotal) {
      win = bet * 2;
    } else if (betOn === 'banker' && bankerTotal > playerTotal) {
      win = bet * 1.95; // 5% commission
    } else if (betOn === 'tie' && playerTotal === bankerTotal) {
      win = bet * 9;
    }

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'baccarat',
      bet,
      win,
      { betOn, playerCards, bankerCards, playerTotal, bankerTotal }
    );

    // Update games played
    user.gamesPlayed.baccarat += 1;
    await user.save();

    res.json({
      playerCards,
      bankerCards,
      playerTotal,
      bankerTotal,
      bet,
      win,
      balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Spanish 21
router.post('/spanish21/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'spanish21', 0.45, [1, 2, 3, 5]);
});

// Pontoon
router.post('/pontoon/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'pontoon', 0.45, [1, 2, 3, 5]);
});

// Double Exposure Blackjack
router.post('/doubleexposure/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'doubleexposure', 0.45, [1, 2]);
});

// Perfect Pairs Blackjack
router.post('/perfectpairs/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'perfectpairs', 0.3, [6, 12, 25]);
});

// Sic Bo
router.post('/sicbo/play', auth, async (req, res) => {
  try {
    const { bet, betType, betValue } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const die3 = Math.floor(Math.random() * 6) + 1;
    const sum = die1 + die2 + die3;

    let win = 0;
    // Check for triple (all same)
    const isTriple = die1 === die2 && die2 === die3;
    
    if (betType === 'triple' && isTriple) {
      win = bet * 180;
    } else if (betType === 'sum' && sum === parseInt(betValue)) {
      const multipliers = { 4: 60, 5: 30, 6: 18, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 18, 16: 30, 17: 60 };
      win = bet * (multipliers[sum] || 0);
    } else if (!isTriple && betType === 'small' && sum >= 4 && sum <= 10) {
      win = bet * 2;
    } else if (!isTriple && betType === 'big' && sum >= 11 && sum <= 17) {
      win = bet * 2;
    }
    // If triple occurs and betType is 'small' or 'big', win remains 0 (lose)

    // Deduct bet and add winnings
    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.sicbo += 1;
    await user.save();

    res.json({
      die1,
      die2,
      die3,
      sum,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dragon Tiger
router.post('/dragontiger/play', auth, async (req, res) => {
  try {
    const { bet, betOn } = req.body; // betOn: 'dragon', 'tiger', 'tie'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const deck = generateDeck();
    const dragonCard = drawCard(deck);
    const tigerCard = drawCard(deck);

    const getValue = (card) => {
      if (card.rank === 'A') return 1;
      if (card.rank === 'J') return 11;
      if (card.rank === 'Q') return 12;
      if (card.rank === 'K') return 13;
      return parseInt(card.rank) || 10;
    };

    const dragonValue = getValue(dragonCard);
    const tigerValue = getValue(tigerCard);

    let win = 0;
    if (betOn === 'dragon' && dragonValue > tigerValue) {
      win = bet * 2;
    } else if (betOn === 'tiger' && tigerValue > dragonValue) {
      win = bet * 2;
    } else if (betOn === 'tie' && dragonValue === tigerValue) {
      win = bet * 8;
    }

    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.dragontiger += 1;
    await user.save();

    res.json({
      dragonCard,
      tigerCard,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Big Small
router.post('/bigsmall/play', auth, async (req, res) => {
  try {
    const { bet, betOn } = req.body; // betOn: 'big', 'small'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const die3 = Math.floor(Math.random() * 6) + 1;
    const sum = die1 + die2 + die3;

    let win = 0;
    if (betOn === 'small' && sum >= 4 && sum <= 10) {
      win = bet * 2;
    } else if (betOn === 'big' && sum >= 11 && sum <= 17) {
      win = bet * 2;
    }

    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.bigsmall += 1;
    await user.save();

    res.json({
      die1,
      die2,
      die3,
      sum,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Hi-Lo
router.post('/hilo/play', auth, async (req, res) => {
  try {
    const { bet, betOn } = req.body; // betOn: 'high', 'low'
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const card = drawCard(generateDeck());
    const value = getCardValue(card.rank);
    const isHigh = value >= 8;

    let win = 0;
    if ((betOn === 'high' && isHigh) || (betOn === 'low' && !isHigh)) {
      win = bet * 2;
    }

    user.balance = user.balance - bet + win;
    user.totalBets += bet;
    if (win > 0) {
      user.totalWinnings += win;
    }
    user.gamesPlayed.hilo += 1;
    await user.save();

    res.json({
      card,
      bet,
      win,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lucky 7
router.post('/lucky7/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'lucky7', 0.15, [5, 10, 20, 50]);
});

// Dice Duel
router.post('/diceduel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'diceduel', 0.4, [1, 2, 3]);
});

// Number Match
router.post('/numbermatch/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'numbermatch', 0.3, [2, 5, 10, 20]);
});

// Quick Draw
router.post('/quickdraw/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'quickdraw', 0.35, [1, 2, 5, 10]);
});

// Number Wheel
router.post('/numberwheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'numberwheel', 0.4, [2, 3, 5, 10]);
});

// Money Wheel
router.post('/moneywheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'moneywheel', 0.4, [2, 5, 10, 20, 50]);
});

// Big Six Wheel
router.post('/bigsix/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'bigsix', 0.4, [1, 2, 5, 10, 20]);
});

// Color Wheel
router.post('/colorwheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'colorwheel', 0.5, [2, 3]);
});

// Multiplier Wheel
router.post('/multiplierwheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'multiplierwheel', 0.4, [2, 3, 5, 10, 20]);
});

// Bonus Wheel
router.post('/bonuswheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'bonuswheel', 0.35, [3, 5, 10, 25, 50]);
});

// Fortune Wheel
router.post('/fortunewheel/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'fortunewheel', 0.4, [2, 5, 10, 20, 100]);
});

// Lottery Draw - Enhanced with number drawing
router.post('/lotterydraw/play', auth, async (req, res) => {
  try {
    const { bet } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Draw 5 winning numbers (1-50)
    const winningNumbers = [];
    while (winningNumbers.length < 5) {
      const num = Math.floor(Math.random() * 50) + 1;
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    winningNumbers.sort((a, b) => a - b);

    // Simple win logic: 20% chance to win
    const random = Math.random();
    let win = 0;
    let multiplier = null;

    if (random < 0.2) {
      const multipliers = [5, 10, 25, 50, 100];
      multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      win = bet * multiplier;
    }

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'lotterydraw',
      bet,
      win,
      { won: win > 0, multiplier, winningNumbers }
    );

    // Update games played
    if (user.gamesPlayed.lotterydraw !== undefined) {
      user.gamesPlayed.lotterydraw += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier,
      winningNumbers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pick 3 - Enhanced with number matching
router.post('/pick3/play', auth, async (req, res) => {
  try {
    const { bet, selectedNumbers } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!selectedNumbers || selectedNumbers.length !== 3) {
      return res.status(400).json({ message: 'Select exactly 3 numbers (0-9)' });
    }

    // Draw 3 winning numbers (0-9)
    const winningNumbers = [];
    while (winningNumbers.length < 3) {
      const num = Math.floor(Math.random() * 10);
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    winningNumbers.sort((a, b) => a - b);

    // Count matches
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num)).length;
    
    // Payout based on matches
    const payoutTable = {
      0: 0,
      1: 2,   // 2x for 1 match
      2: 10,  // 10x for 2 matches
      3: 100  // 100x for 3 matches (jackpot)
    };

    const win = bet * (payoutTable[matches] || 0);
    const multiplier = payoutTable[matches] || 0;

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'pick3',
      bet,
      win,
      { won: win > 0, multiplier, matches, selectedNumbers, winningNumbers }
    );

    // Update games played
    if (user.gamesPlayed.pick3 !== undefined) {
      user.gamesPlayed.pick3 += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier,
      matches,
      selectedNumbers: selectedNumbers.sort((a, b) => a - b),
      winningNumbers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pick 5 - Enhanced with number matching
router.post('/pick5/play', auth, async (req, res) => {
  try {
    const { bet, selectedNumbers } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!selectedNumbers || selectedNumbers.length !== 5) {
      return res.status(400).json({ message: 'Select exactly 5 numbers (1-50)' });
    }

    // Draw 5 winning numbers (1-50)
    const winningNumbers = [];
    while (winningNumbers.length < 5) {
      const num = Math.floor(Math.random() * 50) + 1;
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    winningNumbers.sort((a, b) => a - b);

    // Count matches
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num)).length;
    
    // Payout based on matches
    const payoutTable = {
      0: 0,
      1: 1,    // 1x for 1 match
      2: 3,    // 3x for 2 matches
      3: 10,   // 10x for 3 matches
      4: 50,   // 50x for 4 matches
      5: 500   // 500x for 5 matches (jackpot)
    };

    const win = bet * (payoutTable[matches] || 0);
    const multiplier = payoutTable[matches] || 0;

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'pick5',
      bet,
      win,
      { won: win > 0, multiplier, matches, selectedNumbers, winningNumbers }
    );

    // Update games played
    if (user.gamesPlayed.pick5 !== undefined) {
      user.gamesPlayed.pick5 += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier,
      matches,
      selectedNumbers: selectedNumbers.sort((a, b) => a - b),
      winningNumbers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Number Ball - Enhanced with single number matching
router.post('/numberball/play', auth, async (req, res) => {
  try {
    const { bet, selectedNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!selectedNumber || selectedNumber < 1 || selectedNumber > 36) {
      return res.status(400).json({ message: 'Select a number between 1-36' });
    }

    // Draw 1 winning number (1-36)
    const winningNumber = Math.floor(Math.random() * 36) + 1;

    // Win if numbers match
    const win = (selectedNumber === winningNumber) ? bet * 36 : 0; // 36x payout for exact match
    const multiplier = (selectedNumber === winningNumber) ? 36 : 0;

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'numberball',
      bet,
      win,
      { won: win > 0, multiplier, selectedNumber, winningNumber }
    );

    // Update games played
    if (user.gamesPlayed.numberball !== undefined) {
      user.gamesPlayed.numberball += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier,
      selectedNumber,
      winningNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lucky Numbers - Enhanced with number matching
router.post('/luckynumbers/play', auth, async (req, res) => {
  try {
    const { bet, selectedNumbers } = req.body;
    const user = await User.findById(req.user._id);

    if (bet > 100) {
      return res.status(400).json({ message: 'Maximum bet is $100' });
    }

    if (user.balance < bet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (!selectedNumbers || selectedNumbers.length < 1 || selectedNumbers.length > 6) {
      return res.status(400).json({ message: 'Select 1-6 numbers (1-49)' });
    }

    // Draw 6 winning numbers (1-49)
    const winningNumbers = [];
    while (winningNumbers.length < 6) {
      const num = Math.floor(Math.random() * 49) + 1;
      if (!winningNumbers.includes(num)) {
        winningNumbers.push(num);
      }
    }
    winningNumbers.sort((a, b) => a - b);

    // Count matches
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num)).length;
    
    // Payout based on matches and number of selections
    const payoutTable = {
      1: { 1: 3 },           // 1 number selected: 3x for 1 match
      2: { 1: 1, 2: 10 },    // 2 numbers: 1x for 1, 10x for 2
      3: { 2: 2, 3: 25 },    // 3 numbers: 2x for 2, 25x for 3
      4: { 2: 1, 3: 5, 4: 50 },  // 4 numbers: 1x for 2, 5x for 3, 50x for 4
      5: { 3: 3, 4: 10, 5: 100 }, // 5 numbers: 3x for 3, 10x for 4, 100x for 5
      6: { 3: 2, 4: 5, 5: 25, 6: 500 } // 6 numbers: 2x for 3, 5x for 4, 25x for 5, 500x for 6
    };

    const win = payoutTable[selectedNumbers.length]?.[matches] ? 
                bet * payoutTable[selectedNumbers.length][matches] : 0;
    const multiplier = payoutTable[selectedNumbers.length]?.[matches] || 0;

    // Create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'luckynumbers',
      bet,
      win,
      { won: win > 0, multiplier, matches, selectedNumbers, winningNumbers }
    );

    // Update games played
    if (user.gamesPlayed.luckynumbers !== undefined) {
      user.gamesPlayed.luckynumbers += 1;
    }
    await user.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier,
      matches,
      selectedNumbers: selectedNumbers.sort((a, b) => a - b),
      winningNumbers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Instant Win
router.post('/instantwin/play', auth, async (req, res) => {
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

    const random = Math.random();
    let win = 0;
    let multiplier = null;

    if (random < 0.4) {
      const multipliers = [2, 5, 10];
      multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      win = bet * multiplier;
    }

    // Update user balance and create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'instantwin',
      bet,
      win,
      { won: win > 0, multiplier }
    );

    // Update games played
    const updatedUser = await User.findById(req.user._id);
    if (updatedUser.gamesPlayed && updatedUser.gamesPlayed.instantwin !== undefined) {
      updatedUser.gamesPlayed.instantwin += 1;
    } else {
      if (!updatedUser.gamesPlayed) {
        updatedUser.gamesPlayed = {};
      }
      updatedUser.gamesPlayed.instantwin = 1;
    }
    await updatedUser.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Match 3 - Start game (deduct bet)
router.post('/match3/play', auth, async (req, res) => {
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

    // Deduct bet and create transaction
    const { balance } = await createGameTransactions(
      req.user._id,
      'match3',
      bet,
      0, // No win yet
      { won: false, gameStarted: true }
    );

    // Update games played (re-fetch user to get latest state)
    const updatedUser = await User.findById(req.user._id);
    if (updatedUser.gamesPlayed) {
      if (updatedUser.gamesPlayed.match3 !== undefined) {
        updatedUser.gamesPlayed.match3 += 1;
      } else {
        updatedUser.gamesPlayed.match3 = 1;
      }
    } else {
      updatedUser.gamesPlayed = { match3: 1 };
    }
    await updatedUser.save();

    res.json({
      balance: balance,
      message: 'Game started'
    });
  } catch (error) {
    console.error('Match3 play error:', error);
    res.status(500).json({ message: error.message || 'Error starting game' });
  }
});

// Match 3 - End game (calculate winnings)
router.post('/match3/win', auth, async (req, res) => {
  try {
    const { bet, win, score, won } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add winnings if won (bet was already deducted in /play)
    if (won && win > 0) {
      const balanceBefore = user.balance;
      user.balance += win;
      user.totalWinnings += win;

      // Create win transaction
      const Transaction = require('../models/Transaction');
      const winTransaction = new Transaction({
        user: req.user._id,
        type: 'win',
        amount: win,
        balanceBefore,
        balanceAfter: user.balance,
        status: 'completed',
        game: 'match3',
        description: `Match 3 win of $${win.toFixed(2)}`,
        metadata: { won: true, score, bet, multiplier: win / bet }
      });

      await winTransaction.save();
      await user.save();

      res.json({
        balance: user.balance,
        win,
        bet,
        score,
        won
      });
    } else {
      // Game lost, no winnings (bet already deducted)
      res.json({
        balance: user.balance,
        win: 0,
        bet,
        score,
        won: false
      });
    }
  } catch (error) {
    console.error('Match3 win error:', error);
    res.status(500).json({ message: error.message || 'Error ending game' });
  }
});

// Coin Flip
router.post('/coinflip/play', auth, async (req, res) => {
  try {
    const { bet, betOn } = req.body; // betOn: 'heads', 'tails'
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

    const result = Math.random() > 0.5 ? 'heads' : 'tails';
    const win = (betOn === result) ? bet * 2 : 0;

    // Update user balance and create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'coinflip',
      bet,
      win,
      { betOn, result, won: win > 0 }
    );

    // Update games played
    const updatedUser = await User.findById(req.user._id);
    if (updatedUser.gamesPlayed && updatedUser.gamesPlayed.coinflip !== undefined) {
      updatedUser.gamesPlayed.coinflip += 1;
    } else {
      if (!updatedUser.gamesPlayed) {
        updatedUser.gamesPlayed = {};
      }
      updatedUser.gamesPlayed.coinflip = 1;
    }
    await updatedUser.save();

    res.json({
      result,
      bet,
      win,
      balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Quick Win
router.post('/quickwin/play', auth, async (req, res) => {
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

    const random = Math.random();
    let win = 0;
    let multiplier = null;

    if (random < 0.45) {
      const multipliers = [1, 2, 3, 5];
      multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      win = bet * multiplier;
    }

    // Update user balance and create transactions
    const { balance } = await createGameTransactions(
      req.user._id,
      'quickwin',
      bet,
      win,
      { won: win > 0, multiplier }
    );

    // Update games played
    const updatedUser = await User.findById(req.user._id);
    if (updatedUser.gamesPlayed && updatedUser.gamesPlayed.quickwin !== undefined) {
      updatedUser.gamesPlayed.quickwin += 1;
    } else {
      if (!updatedUser.gamesPlayed) {
        updatedUser.gamesPlayed = {};
      }
      updatedUser.gamesPlayed.quickwin = 1;
    }
    await updatedUser.save();

    res.json({
      bet,
      win,
      balance,
      won: win > 0,
      multiplier
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Classic Slots
router.post('/classicslots/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'classicslots', 0.4, [2, 5, 10, 20]);
});

// Fruit Slots
router.post('/fruitslots/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'fruitslots', 0.4, [2, 5, 10, 25]);
});

// Diamond Slots
router.post('/diamondslots/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'diamondslots', 0.35, [3, 5, 10, 25, 50]);
});

// Progressive Slots
router.post('/progressiveslots/play', auth, async (req, res) => {
  await playSimpleGame(req, res, 'progressiveslots', 0.3, [5, 10, 25, 50, 100]);
});

// Multi-Line Slots
router.post('/multilineslots/play', auth, async (req, res) => {
  try {
    const { bet, paylines = 5 } = req.body; // bet per line, paylines = number of lines to bet on
    const user = await User.findById(req.user._id);
    
    const totalBet = bet * paylines; // Total bet = bet per line × number of paylines

    if (totalBet > 100) {
      return res.status(400).json({ message: 'Maximum total bet is $100' });
    }

    if (user.balance < totalBet) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Generate random symbols for multi-line slots (3x3 grid)
    const symbols = ['🎯', '🎲', '🎪', '🎨', '🎭', '🎬', '🎤', '🎧'];
    const reels = [
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ],
      [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]
    ];

    // Define all possible paylines
    const allPaylines = [
      reels[0], // 1. Top row (horizontal)
      reels[1], // 2. Middle row (horizontal)
      reels[2], // 3. Bottom row (horizontal)
      [reels[0][0], reels[1][1], reels[2][2]], // 4. Diagonal top-left to bottom-right
      [reels[0][2], reels[1][1], reels[2][0]], // 5. Diagonal top-right to bottom-left
      [reels[0][0], reels[0][1], reels[1][2]], // 6. V shape (top)
      [reels[1][0], reels[2][1], reels[2][2]], // 7. V shape (bottom)
      [reels[0][2], reels[1][1], reels[0][0]], // 8. Inverted V (top)
      [reels[2][0], reels[1][1], reels[2][2]]  // 9. Inverted V (bottom)
    ];
    
    // Select only the active paylines based on user selection
    const activePaylines = allPaylines.slice(0, paylines);
    
    // Check for wins across selected paylines
    let totalWin = 0;
    let maxMultiplier = 0;
    
    activePaylines.forEach((line) => {
      // Three of a kind
      if (line[0] === line[1] && line[1] === line[2]) {
        const symbolIndex = symbols.indexOf(line[0]);
        const multiplier = [10, 8, 6, 5, 4, 3, 2, 2][symbolIndex] || 2;
        totalWin += bet * multiplier;
        maxMultiplier = Math.max(maxMultiplier, multiplier);
      } 
      // Two of a kind
      else if (line[0] === line[1] || line[1] === line[2] || line[0] === line[2]) {
        const multiplier = 1.5;
        totalWin += bet * multiplier;
        maxMultiplier = Math.max(maxMultiplier, multiplier);
      }
    });

    const win = totalWin;
    const multiplier = maxMultiplier > 0 ? maxMultiplier : undefined;

    // Create transactions (use total bet, not bet per line)
    const { balance } = await createGameTransactions(
      req.user._id,
      'multilineslots',
      totalBet,
      win,
      { reels, multiplier: multiplier > 0 ? multiplier : undefined, paylines }
    );

    // Update games played
    if (user.gamesPlayed.multilineslots !== undefined) {
      user.gamesPlayed.multilineslots += 1;
    }
    await user.save();

    res.json({
      reels, // 3x3 grid
      bet,
      win,
      balance,
      multiplier: multiplier > 0 ? multiplier : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

