import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../../database';
import { securityConfig } from '../../config/securityConfig';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { sendEmail } from '../../utils/emailService';

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

function setAdminCookie(res: express.Response, token: string) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: isProduction,
    // 'none' required in production so the cookie is sent back on cross-site
    // XHR when the SPA (vpathrewards.store) calls the API on a different domain.
    // 'strict' in dev is fine since everything runs on localhost.
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

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

    const token = jwt.sign({ userId: user.id }, securityConfig.jwt.secret, { expiresIn: securityConfig.jwt.adminExpiresIn } as jwt.SignOptions);
    setAdminCookie(res, token);

    res.json({
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
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
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

// Current admin user
router.get('/me', authenticateAdmin, async (req: AdminRequest, res) => {
  try {
    const user = await dbGet(
      'SELECT id, email, name, is_admin FROM users WHERE id = ?',
      [req.userId]
    ) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { ...user, is_admin: true } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout — clears admin cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  res.json({ message: 'Logged out' });
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
      res.json({ message: `Test email sent to ${to}` });
    } else {
      res.status(500).json({ error: 'Failed to send test email — check server logs' });
    }
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
