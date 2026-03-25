import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbGet } from '../database';
import { securityConfig } from '../config/securityConfig';

export interface AdminRequest extends Request {
  userId?: number;
  isAdmin?: boolean;
}

export const authenticateAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  // Prefer httpOnly cookie; fall back to Authorization header for API clients
  const cookieToken = req.cookies?.admin_token;
  const authHeader = req.headers['authorization'];
  const token = cookieToken || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, securityConfig.jwt.secret) as any;
    req.userId = decoded.userId;

    // Check if user is admin — use truthy check so it works whether
    // PostgreSQL returns is_admin as integer 1 or boolean true.
    const user = await dbGet('SELECT is_admin FROM users WHERE id = ?', [decoded.userId]) as { is_admin: number | boolean } | undefined;

    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
