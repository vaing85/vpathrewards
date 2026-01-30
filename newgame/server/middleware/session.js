/**
 * Session Management Middleware
 * 
 * Handles JWT token refresh, session timeout, and token blacklisting
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory token blacklist (for production, use Redis)
const tokenBlacklist = new Set();

// Clean up old blacklisted tokens periodically
setInterval(() => {
  // In production, this would be handled by Redis TTL
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
}, 60 * 60 * 1000); // Every hour

/**
 * Check if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Blacklist a token
 */
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: '15m' } // 15 minutes
  );
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: '7d' } // 7 days
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
    );
  } catch (error) {
    return null;
  }
};

/**
 * Enhanced auth middleware with token refresh support
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
    
    // Ensure it's an access token
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Refresh token endpoint handler
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Check if refresh token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    const decoded = verifyRefreshToken(token);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Blacklist old refresh token
    blacklistToken(token);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

/**
 * Logout handler - blacklist tokens
 */
const logout = (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { refreshToken } = req.body;

    if (token) {
      blacklistToken(token);
    }

    if (refreshToken) {
      blacklistToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error during logout' });
  }
};

/**
 * Admin auth middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    res.status(403).json({ message: 'Access denied' });
  }
};

module.exports = {
  auth,
  adminAuth,
  generateAccessToken,
  generateRefreshToken,
  refreshToken,
  logout,
  blacklistToken,
  isTokenBlacklisted
};

