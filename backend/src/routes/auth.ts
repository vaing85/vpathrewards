import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../database';
import { securityConfig } from '../config/securityConfig';
import { sendEmail, sendEmailToUser } from '../utils/emailService';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

function setAuthCookie(res: express.Response, token: string) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
}

// Current user (validates cookie / Authorization header)
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await dbGet(
      'SELECT id, email, name, total_earnings FROM users WHERE id = ?',
      [req.userId]
    ) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout — clears auth cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ message: 'Logged out' });
});

// Register
router.post('/register', validateRegister, async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, name, referral_code } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await dbRun(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    const userId = (result as any).lastID;
    
    // Handle referral code if provided
    if (referral_code) {
      try {
        const referrer = await dbGet(
          'SELECT user_id FROM user_referral_codes WHERE referral_code = ?',
          [referral_code]
        ) as { user_id: number } | undefined;
        
        if (referrer && referrer.user_id !== userId) {
          // Create referral relationship
          await dbRun(
            'INSERT INTO referral_relationships (referrer_id, referred_id, referral_code) VALUES (?, ?, ?)',
            [referrer.user_id, userId, referral_code]
          );
        }
      } catch (refError) {
        // Don't fail registration if referral code is invalid
        console.error('Error processing referral code:', refError);
      }
    }

    // Create referral code for new user
    const userReferralCode = `REF${userId}${Date.now().toString().slice(-6)}`;
    await dbRun(
      'INSERT INTO user_referral_codes (user_id, referral_code) VALUES (?, ?)',
      [userId, userReferralCode]
    );

    const token = jwt.sign({ userId }, securityConfig.jwt.secret, { expiresIn: securityConfig.jwt.expiresIn } as jwt.SignOptions);
    setAuthCookie(res, token);

    // Send welcome email (async, don't wait for it)
    sendEmailToUser(userId, email, 'welcome', { name }, 'email').catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      user: {
        id: userId,
        email,
        name,
        total_earnings: 0
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', validateLogin, async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, securityConfig.jwt.secret, { expiresIn: securityConfig.jwt.expiresIn } as jwt.SignOptions);
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        total_earnings: user.total_earnings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password — sends reset link
router.post('/forgot-password', async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await dbGet('SELECT id, name, email FROM users WHERE email = ?', [email]) as any;

    // Always respond the same way to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await dbRun(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expires.toISOString(), user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail(user.email, 'passwordReset', { name: user.name, resetUrl });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password — validates token and sets new password
router.post('/reset-password', async (req: express.Request, res: express.Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
    }

    const user = await dbGet(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    ) as any;

    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
