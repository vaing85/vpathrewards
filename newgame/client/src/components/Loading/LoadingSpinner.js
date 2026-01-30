import React from 'react';
import './LoadingSpinner.css';

/**
 * Loading Spinner Component
 * 
 * @param {string} size - Size of spinner: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} color - Color of spinner (default: 'primary')
 * @param {string} text - Optional text to display below spinner
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary', text = null }) => {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className={`loading-spinner ${color}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

