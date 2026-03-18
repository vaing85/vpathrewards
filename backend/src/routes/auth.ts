import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../database';
import { securityConfig } from '../config/securityConfig';
import { sendEmailToUser } from '../utils/emailService';
import { validateRegister, validateLogin } from '../middleware/validation';

const router = express.Router();

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

export default router;
