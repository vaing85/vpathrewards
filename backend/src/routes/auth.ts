import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../database';
import { sendEmail, sendEmailToUser } from '../utils/emailService';
import { validateRegister, validateLogin } from '../middleware/validation';
import { securityConfig } from '../config/securityConfig';
import { verifyTurnstile } from '../utils/verifyTurnstile';

const router = express.Router();

/** Hash a reset token for storage. SHA-256 is fine here (vs bcrypt) because the
 *  token is 256 bits of entropy — no brute-forcing possible. SHA-256 is also
 *  deterministic, which lets us look up by hash directly. */
function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Register
router.post('/register', validateRegister, async (req: import('express').Request, res: import('express').Response) => {
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

    const token = jwt.sign({ userId }, securityConfig.jwt.secret, { expiresIn: '7d' });

    // Send welcome email (async, don't wait for it)
    sendEmailToUser(userId, email, 'welcome', { name }, 'email').catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      token,
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
router.post('/login', validateLogin, async (req: import('express').Request, res: import('express').Response) => {
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

    const token = jwt.sign({ userId: user.id }, securityConfig.jwt.secret, { expiresIn: '7d' });

    res.json({
      token,
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

/**
 * POST /auth/forgot-password
 *
 * Always returns 200 to prevent account enumeration — the client cannot tell
 * from the response whether the email is registered. Failures are logged
 * server-side only.
 *
 * Flow when the email IS registered:
 *   1. Invalidate any previous unused tokens for this user (so an attacker
 *      holding an older token can't use it after the user requested a new one).
 *   2. Generate 32 bytes of cryptographic randomness, base64url-encode it.
 *   3. Store SHA-256 hash of the token with a 1-hour expiry.
 *   4. Email a link with the PLAINTEXT token.
 */
router.post('/forgot-password', async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { email, turnstileToken } = req.body as { email?: string; turnstileToken?: string };

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const captchaOk = await verifyTurnstile(turnstileToken);
    if (!captchaOk) {
      return res.status(400).json({ error: 'Captcha verification failed' });
    }

    const user = await dbGet(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email]
    ) as { id: number; name: string; email: string } | undefined;

    if (user) {
      // Invalidate any prior unused tokens for this user.
      await dbRun(
        `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND used_at IS NULL`,
        [user.id]
      );

      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await dbRun(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [user.id, tokenHash, expiresAt]
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      // Fire and forget — the user shouldn't wait on SMTP latency, and a
      // delivery failure must not be visible in the response (enumeration).
      sendEmail(user.email, 'passwordReset', { name: user.name, resetLink }).catch((err) => {
        console.error('Failed to send password reset email:', err);
      });
    }

    // Always 200, same shape regardless of whether the email exists.
    res.json({ ok: true });
  } catch (error) {
    console.error('Forgot-password error:', error);
    // Even on internal error, return 200 to avoid leaking account existence.
    res.json({ ok: true });
  }
});

/**
 * POST /auth/reset-password
 *
 * Body: { token: string, password: string }
 *
 * Looks up the token by its SHA-256 hash, checks expiry and that it hasn't
 * been used, then updates the user's password and marks the token used.
 * Also revokes all refresh tokens for that user so any other sessions are
 * invalidated.
 */
router.post('/reset-password', async (req: import('express').Request, res: import('express').Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashResetToken(token);
    const row = await dbGet(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
      [tokenHash]
    ) as { id: number; user_id: number; expires_at: string; used_at: string | null } | undefined;

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This link is invalid or has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.user_id]);
    await dbRun(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [row.id]
    );

    // Invalidate any active refresh tokens so other sessions are forced to re-login.
    await dbRun('DELETE FROM refresh_tokens WHERE user_id = ?', [row.user_id]).catch(() => {
      // refresh_tokens table may not exist in older environments — ignore.
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Reset-password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
