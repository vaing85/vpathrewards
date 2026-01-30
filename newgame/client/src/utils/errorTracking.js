/**
 * Error Tracking Utility
 * 
 * This utility provides error tracking functionality that can be extended
 * to integrate with services like Sentry, LogRocket, or custom logging.
 * 
 * For production, replace the console logging with actual error tracking service.
 */

class ErrorTracker {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log an error with context
   * @param {Error} error - The error object
   * @param {object} context - Additional context (user, action, etc.)
   */
  logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    };

    // In development, log to console
    if (this.isDevelopment) {
      console.error('Error tracked:', errorData);
    }

    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendToService(errorData);
    }
  }

  /**
   * Log React component error
   * @param {Error} error - The error object
   * @param {object} errorInfo - React error info
   * @param {object} context - Additional context
   */
  logReactError(error, errorInfo, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...context
    };

    if (this.isDevelopment) {
      console.error('React error tracked:', errorData);
    }

    if (this.isProduction) {
      this.sendToService(errorData);
    }
  }

  /**
   * Log API error
   * @param {Error} error - The error object
   * @param {object} requestInfo - Request information
   */
  logApiError(error, requestInfo = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: requestInfo.url || window.location.href,
      method: requestInfo.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      ...requestInfo
    };

    if (this.isDevelopment) {
      console.error('API error tracked:', errorData);
    }

    if (this.isProduction) {
      this.sendToService(errorData);
    }
  }

  /**
   * Send error to tracking service
   * TODO: Integrate with Sentry, LogRocket, or custom endpoint
   * @param {object} errorData - Error data to send
   */
  sendToService(errorData) {
    // Example: Send to custom API endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // }).catch(err => console.error('Failed to send error:', err));

    // Example: Sentry integration
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorData.message), {
    //     extra: errorData
    //   });
    // }

    // For now, log to console in production (replace with actual service)
    console.error('Production error:', errorData);
  }

  /**
   * Set user context for error tracking
   * @param {object} user - User information
   */
  setUser(user) {
    this.user = user;
    // Example: Sentry.setUser({ id: user._id, email: user.email });
  }

  /**
   * Clear user context
   */
  clearUser() {
    this.user = null;
    // Example: Sentry.setUser(null);
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

export default errorTracker;

