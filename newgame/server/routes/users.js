const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorLogger');

const router = express.Router();

// Get user profile
router.get('/profile', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
}));

// Update balance (for deposits/withdrawals)
router.put('/balance', auth, asyncHandler(async (req, res) => {
    const { amount, type } = req.body; // type: 'deposit' or 'withdrawal'
    const user = await User.findById(req.user._id);

    if (type === 'deposit') {
      user.balance += amount;
    } else if (type === 'withdrawal') {
      if (user.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      user.balance -= amount;
    }

    await user.save();
    res.json({ balance: user.balance });
}));

// Update user profile
router.put('/profile', auth, asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const user = await User.findById(req.user._id);

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
      user.email = email;
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();
    const updatedUser = await User.findById(user._id).select('-password');
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
}));

module.exports = router;

