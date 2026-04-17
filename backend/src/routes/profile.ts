import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbGet, dbRun } from '../database';
import { validateProfileUpdate, validatePasswordChange } from '../middleware/validation';

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet(`
      SELECT 
        id,
        email,
        name,
        total_earnings,
        created_at,
        notification_email,
        notification_cashback,
        notification_withdrawal,
        notification_new_offers
      FROM users 
      WHERE id = ?
    `, [req.userId]) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/', authenticateToken, validateProfileUpdate, async (req: AuthRequest, res: import('express').Response) => {
  try {
    const { name, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.userId]) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]) as any;
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    await dbRun(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email || user.email, req.userId]
    );

    const updated = await dbGet(`
      SELECT 
        id,
        email,
        name,
        total_earnings,
        created_at,
        notification_email,
        notification_cashback,
        notification_withdrawal
      FROM users 
      WHERE id = ?
    `, [req.userId]);

    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/password', authenticateToken, validatePasswordChange, async (req: AuthRequest, res: import('express').Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await dbGet('SELECT password FROM users WHERE id = ?', [req.userId]) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification preferences
router.put('/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { notification_email, notification_cashback, notification_withdrawal, notification_new_offers } = req.body;

    // Get current user to preserve values if not provided
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.userId]) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await dbRun(
      'UPDATE users SET notification_email = ?, notification_cashback = ?, notification_withdrawal = ?, notification_new_offers = ? WHERE id = ?',
      [
        notification_email !== undefined ? (notification_email ? 1 : 0) : (user.notification_email || 1),
        notification_cashback !== undefined ? (notification_cashback ? 1 : 0) : (user.notification_cashback || 1),
        notification_withdrawal !== undefined ? (notification_withdrawal ? 1 : 0) : (user.notification_withdrawal || 1),
        notification_new_offers !== undefined ? (notification_new_offers ? 1 : 0) : (user.notification_new_offers || 0),
        req.userId
      ]
    );

    const updated = await dbGet(`
      SELECT 
        notification_email,
        notification_cashback,
        notification_withdrawal,
        notification_new_offers
      FROM users 
      WHERE id = ?
    `, [req.userId]);

    res.json(updated);
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
