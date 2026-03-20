import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../../database';
import { securityConfig } from '../../config/securityConfig';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { sendEmail } from '../../utils/emailService';

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user and check if admin
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_admin !== 1) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, securityConfig.jwt.secret, { expiresIn: securityConfig.jwt.expiresIn } as jwt.SignOptions);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: true
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change admin password
router.post('/change-password', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.userId]) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email — sends a welcome-style test to any address
router.post('/test-email', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'to email address is required' });

    const apiKey = process.env.RESEND_API_KEY;
    const fromAddr = process.env.RESEND_FROM || 'onboarding@resend.dev';

    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not set in environment' });
    }

    const ok = await sendEmail(to, 'welcome', { name: 'Test User' });
    if (ok) {
      res.json({ message: `Test email sent to ${to}`, from: fromAddr });
    } else {
      res.status(500).json({ error: 'Resend returned an error — check server logs', from: fromAddr, apiKeySet: !!apiKey });
    }
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
