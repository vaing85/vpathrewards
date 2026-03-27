import { Request, Response, NextFunction } from 'express';
import { appConfig } from '../config/appConfig';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // CSRF failures get a recognisable code so they're easy to spot in logs.
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF validation failed:', { url: req.url, method: req.method, ip: req.ip });
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  console.error('Error:', {
    message: err.message,
    stack: appConfig.isDevelopment ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : appConfig.isProduction
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({
    error: message,
    ...(appConfig.isDevelopment && { stack: err.stack })
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
