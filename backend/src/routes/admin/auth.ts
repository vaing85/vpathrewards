import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet } from '../../database';
import { securityConfig } from '../../config/securityConfig';

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

export default router;
