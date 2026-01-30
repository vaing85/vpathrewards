const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bonus = require('../models/Bonus');
const Promotion = require('../models/Promotion');
const { generateAccessToken, generateRefreshToken } = require('../middleware/session');
const { auth, logout: sessionLogout } = require('../middleware/session');
const { createNotification } = require('./notifications');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateEmail, validatePassword, validateUsername } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorLogger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Register
router.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Validate inputs
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ message: usernameValidation.error });
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ message: emailValidation.error });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.error });
  }

  // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    user = new User({ username, email, password });
    await user.save();

    // Apply welcome bonus if available
    let welcomeBonusAmount = 0;
    try {
      const now = new Date();
      const welcomePromotion = await Promotion.findOne({
        type: 'welcome',
        active: true,
        startDate: { $lte: now },
        $or: [
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      }).sort({ createdAt: -1 });

      if (welcomePromotion) {
        // Check if promotion has reached max uses
        if (!welcomePromotion.maxUses || welcomePromotion.currentUses < welcomePromotion.maxUses) {
          welcomeBonusAmount = welcomePromotion.bonusType === 'fixed' 
            ? welcomePromotion.bonusValue 
            : welcomePromotion.bonusValue; // For welcome, treat percentage as fixed

          if (welcomePromotion.maxBonus && welcomeBonusAmount > welcomePromotion.maxBonus) {
            welcomeBonusAmount = welcomePromotion.maxBonus;
          }

          if (welcomeBonusAmount > 0) {
            // Apply bonus to balance
            const balanceBefore = user.balance;
            user.balance += welcomeBonusAmount;
            await user.save();

            // Create transaction
            const transaction = new Transaction({
              user: user._id,
              type: 'bonus',
              amount: welcomeBonusAmount,
              balanceBefore,
              balanceAfter: user.balance,
              status: 'completed',
              description: `Welcome bonus: $${welcomeBonusAmount.toFixed(2)} (${welcomePromotion.name})`,
              metadata: { promotionId: welcomePromotion._id, bonusType: 'welcome' }
            });
            await transaction.save();

            // Create bonus record
            const bonus = new Bonus({
              user: user._id,
              type: 'welcome',
              amount: welcomeBonusAmount,
              status: 'active',
              promotion: welcomePromotion._id,
              metadata: { transactionId: transaction._id }
            });
            await bonus.save();

            // Update promotion usage
            welcomePromotion.currentUses += 1;
            await welcomePromotion.save();

            // Create notification
            try {
              await createNotification(
                user._id,
                'bonus',
                '🎁 Welcome Bonus',
                `Welcome! You received a $${welcomeBonusAmount.toFixed(2)} welcome bonus!`,
                { bonusId: bonus._id, amount: welcomeBonusAmount }
              );
            } catch (error) {
              console.error('Error creating welcome bonus notification:', error);
            }

            user.welcomeBonusReceived = true;
            await user.save();
          }
        }
      }
    } catch (error) {
      console.error('Error applying welcome bonus:', error);
      // Don't fail registration if bonus fails
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
}));

// Login
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate inputs
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ message: emailValidation.error });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.error });
  }

  // Find user
  const user = await User.findOne({ email: emailValidation.value });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check password
  const isMatch = await user.comparePassword(passwordValidation.value);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      balance: user.balance
    }
  });
}));

// Get current user
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
}));

// Refresh token
const { refreshToken } = require('../middleware/session');
router.post('/refresh', asyncHandler(async (req, res) => {
  await refreshToken(req, res);
}));

// Logout
router.post('/logout', auth, asyncHandler(async (req, res) => {
  const { logout: sessionLogout } = require('../middleware/session');
  sessionLogout(req, res);
}));

module.exports = router;

