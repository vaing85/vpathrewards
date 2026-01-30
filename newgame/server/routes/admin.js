const express = require('express');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users with search and filtering
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { 
      search, 
      role, 
      status, 
      minBalance, 
      maxBalance,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};

    // Search by username or email
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by balance range
    if (minBalance || maxBalance) {
      query.balance = {};
      if (minBalance) query.balance.$gte = parseFloat(minBalance);
      if (maxBalance) query.balance.$lte = parseFloat(maxBalance);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user balance
router.put('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance += amount;
    await user.save();

    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!['player', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be "player" or "admin"' });
    }

    user.role = role;
    await user.save();

    res.json({ 
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend user
router.post('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in hours
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'suspended';
    user.suspensionReason = reason || 'No reason provided';
    
    if (duration) {
      user.suspendedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    }

    await user.save();

    res.json({ 
      message: 'User suspended successfully',
      user: {
        id: user._id,
        username: user.username,
        status: user.status,
        suspendedUntil: user.suspendedUntil
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ban user
router.post('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'banned';
    user.suspensionReason = reason || 'No reason provided';
    user.suspendedUntil = null; // Permanent ban

    await user.save();

    res.json({ 
      message: 'User banned successfully',
      user: {
        id: user._id,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Activate user (remove suspension/ban)
router.post('/users/:id/activate', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'active';
    user.suspendedUntil = null;
    user.suspensionReason = null;

    await user.save();

    res.json({ 
      message: 'User activated successfully',
      user: {
        id: user._id,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk operations
router.post('/users/bulk', adminAuth, async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    let update = {};
    let message = '';

    switch (action) {
      case 'activate':
        update = { status: 'active', suspendedUntil: null, suspensionReason: null };
        message = 'Users activated successfully';
        break;
      case 'suspend':
        update = { status: 'suspended' };
        message = 'Users suspended successfully';
        break;
      case 'ban':
        update = { status: 'banned', suspendedUntil: null };
        message = 'Users banned successfully';
        break;
      case 'delete':
        // Soft delete by setting status to banned
        update = { status: 'banned' };
        message = 'Users deleted successfully';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: update }
    );

    res.json({
      message,
      affectedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get platform statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPlayers = await User.countDocuments({ role: 'player' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const bannedUsers = await User.countDocuments({ status: 'banned' });
    
    const users = await User.find();
    const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
    const totalBets = users.reduce((sum, user) => sum + user.totalBets, 0);
    const totalWinnings = users.reduce((sum, user) => sum + user.totalWinnings, 0);

    res.json({
      totalUsers,
      totalPlayers,
      totalAdmins,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalBalance,
      totalBets,
      totalWinnings,
      platformProfit: totalBets - totalWinnings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

