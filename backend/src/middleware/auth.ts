import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { securityConfig } from '../config/securityConfig';

export interface AuthRequest extends Request {
  userId?: number;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, securityConfig.jwt.secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
};
