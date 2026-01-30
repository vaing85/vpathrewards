/**
 * Error Logging Middleware
 * 
 * Logs errors to console and can be extended to send to error tracking service
 */

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
const logError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };

  // Log to console
  console.error('Server error:', errorData);

  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // Example:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.user?.id,
    body: req.body
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'An error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
};

/**
 * Async error wrapper - catches errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  logError,
  errorHandler,
  asyncHandler
};

