/**
 * Activity Logger Middleware
 * Logs user activities for admin review
 */

const UserActivity = require('../models/UserActivity');

/**
 * Log user activity
 */
const logActivity = async (userId, action, details = {}, req = null) => {
  try {
    await UserActivity.create({
      userId,
      action,
      details,
      ip: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get('user-agent') || null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the app
  }
};

/**
 * Middleware to log activities automatically
 */
const activityLogger = (action) => {
  return async (req, res, next) => {
    // Log after response is sent
    const originalSend = res.send;
    res.send = function(data) {
      if (req.user && req.user._id) {
        logActivity(req.user._id, action, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        }, req);
      }
      return originalSend.call(this, data);
    };
    next();
  };
};

module.exports = {
  logActivity,
  activityLogger
};

