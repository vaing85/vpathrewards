import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbGet } from '../database';

export interface AdminRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
}

export const authenticateAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, secret) as any;
    req.userId = decoded.userId;

    // Check if user is admin
    const user = await dbGet('SELECT is_admin FROM users WHERE id = ?', [decoded.userId]) as { is_admin: number } | undefined;
    
    if (!user || user.is_admin !== 1) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
