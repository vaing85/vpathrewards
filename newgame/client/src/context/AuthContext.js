import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import errorTracker from '../utils/errorTracking';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      fetchUser();
    } else if (refreshToken) {
      // Try to refresh token
      refreshAccessToken();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data;
      
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('token', newAccessToken); // Legacy support for games using 'token'
      localStorage.setItem('refreshToken', newRefreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      setUser(user);
      errorTracker.setUser(user);
      setLoading(false);
    } catch (error) {
      // Refresh failed, clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token'); // Legacy support
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      errorTracker.clearUser();
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
      // Set user context for error tracking
      if (response.data) {
        errorTracker.setUser(response.data);
      }
    } catch (error) {
      // If token expired, try to refresh
      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        await refreshAccessToken();
        return;
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token'); // Legacy support
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      errorTracker.clearUser();
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Trim whitespace from inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      const response = await axios.post(`${API_URL}/auth/login`, { 
        email: trimmedEmail, 
        password: trimmedPassword 
      });
      const { accessToken, refreshToken, user } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken); // Legacy support for games using 'token'
      localStorage.setItem('refreshToken', refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setUser(user);
      errorTracker.setUser(user);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage === 'Invalid credentials') {
        userFriendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
      }
      return { success: false, message: userFriendlyMessage };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      const { accessToken, refreshToken, user } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('token', accessToken); // Legacy support for games using 'token'
      localStorage.setItem('refreshToken', refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setUser(user);
      errorTracker.setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Call logout endpoint to blacklist tokens
        await axios.post(`${API_URL}/auth/logout`, { refreshToken }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token'); // Legacy support
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      errorTracker.clearUser();
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

