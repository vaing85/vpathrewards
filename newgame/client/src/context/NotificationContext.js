import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/Notifications/ToastContainer';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration = 6000) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  // Helper function for insufficient balance errors
  const showInsufficientBalance = useCallback((required, current, duration = 6000) => {
    const message = `Insufficient balance. You need $${required.toFixed(2)} but only have $${current.toFixed(2)}. Please deposit more funds or reduce your bet.`;
    return showError(message, duration);
  }, [showError]);

  // Helper function for validation errors
  const showValidationError = useCallback((message, duration = 5000) => {
    return showError(message, duration);
  }, [showError]);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showInsufficientBalance,
    showValidationError,
    removeToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </NotificationContext.Provider>
  );
};

