/**
 * Axios Interceptor Setup
 * 
 * Sets up global error tracking for API calls
 */

import axios from 'axios';
import errorTracker from './errorTracking';

// Request interceptor - add user context if available
axios.interceptors.request.use(
  (config) => {
    // Add timestamp for tracking
    config.metadata = { startTime: new Date() };
    
    // Validate token if Authorization header is present
    if (config.headers?.Authorization) {
      const token = config.headers.Authorization.replace('Bearer ', '').trim();
      if (!token || token === 'null' || token === 'undefined') {
        // Remove invalid token and let the request fail with 401
        delete config.headers.Authorization;
        console.warn('Invalid or missing token detected, removing Authorization header');
      }
    }
    
    return config;
  },
  (error) => {
    errorTracker.logApiError(error, {
      type: 'request',
      message: 'Request interceptor error'
    });
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - track errors and handle token refresh
axios.interceptors.response.use(
  (response) => {
    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      if (duration > 1000) {
        console.warn(`Slow API request: ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we haven't tried to refresh yet
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Refresh failed, clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axios.defaults.headers.common['Authorization'];
        
        // Track the error
        errorTracker.logApiError(refreshError, {
          url: '/auth/refresh',
          message: 'Token refresh failed'
        });

        return Promise.reject(refreshError);
      }
    }

    // Retry logic for network errors and 5xx errors (only if not handling token refresh)
    // Skip retry if we already handled token refresh above
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      // Already handled above, don't retry
      const errorInfo = {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.response?.data?.error || error.message
      };
      errorTracker.logApiError(error, errorInfo);
      return Promise.reject(error);
    }

    const shouldRetry = 
      !originalRequest._retry &&
      (
        !error.response || // Network error
        (error.response?.status >= 500 && error.response?.status < 600) // Server errors
      ) &&
      (!originalRequest._retryCount || originalRequest._retryCount < 3); // Max 3 retries

    if (shouldRetry) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      originalRequest._retry = true;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000;

      console.log(`Retrying request (attempt ${originalRequest._retryCount}/3) after ${delay}ms...`);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(axios(originalRequest));
        }, delay);
      });
    }

    // Track API errors with more detail
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.response?.data?.error || error.message,
      retryCount: originalRequest._retryCount || 0
    };
    
    // Log 400 errors with more detail for debugging
    if (error.response?.status === 400) {
      console.error('400 Bad Request:', {
        url: errorInfo.url,
        method: errorInfo.method,
        message: errorInfo.message,
        requestData: error.config?.data,
        responseData: error.response?.data
      });
    }
    
    errorTracker.logApiError(error, errorInfo);

    return Promise.reject(error);
  }
);

export default axios;

