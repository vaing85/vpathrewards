const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * Helper function to create a notification
 * @param {String} userId - User ID
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Created notification
 */
async function createNotification(userId, type, title, message, metadata = {}) {
  const notification = new Notification({
    user: userId,
    type,
    title,
    message,
    metadata
  });
  await notification.save();
  return notification;
}

/**
 * Get all notifications for the current user
 * Query params: limit, page, unreadOnly
 */
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, page = 1, unreadOnly = false } = req.query;
    const userId = req.user._id;

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      notifications,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({ user: userId, read: false });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Mark a notification as read
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Mark all notifications as read
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );

    res.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Delete a notification
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { router, createNotification };

