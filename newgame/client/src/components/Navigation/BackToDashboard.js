import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BackToDashboard.css';

/**
 * Back to Dashboard Button Component
 * Reusable component to navigate back to the dashboard from any page
 */
function BackToDashboard({ className = '', variant = 'button' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/dashboard');
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleClick}
        className={`back-to-dashboard-link ${className}`}
        aria-label="Return to dashboard"
      >
        ← Back to Dashboard
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`back-to-dashboard-btn ${className}`}
      aria-label="Return to dashboard"
    >
      🏠 Back to Dashboard
    </button>
  );
}

export default BackToDashboard;

