const express = require('express');
const { adminAuth } = require('../middleware/auth');
const UserActivity = require('../models/UserActivity');

const router = express.Router();

// Get user activity logs (admin only)
router.get('/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, page = 1, limit = 50 } = req.query;

    const query = { userId };
    if (action) {
      query.action = action;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username email');

    const total = await UserActivity.countDocuments(query);

    res.json({
      activities,
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

// Get all activities (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { action, userId, page = 1, limit = 50, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username email');

    const total = await UserActivity.countDocuments(query);

    res.json({
      activities,
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

module.exports = router;

