import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../ThemeToggle/ThemeToggle';
import SoundToggle from '../../SoundToggle/SoundToggle';
import './GameHeader.css';

/**
 * Reusable game header component
 * @param {string} title - Game title
 * @param {number} balance - User balance
 * @param {string} backPath - Path to navigate back to (default: '/dashboard')
 * @param {string} backLabel - Back button label (default: '← Back to Dashboard')
 */
const GameHeader = ({ 
  title, 
  balance = 0, 
  backPath = '/dashboard',
  backLabel = '← Back to Dashboard'
}) => {
  const navigate = useNavigate();

  return (
    <div className="game-header">
      <button 
        onClick={() => navigate(backPath)} 
        className="back-btn"
        aria-label="Go back"
      >
        {backLabel}
      </button>
      <h1>{title}</h1>
      <div className="game-header-right">
        <div className="balance-display" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Current balance:</span>
          Balance: ${balance.toFixed(2)}
        </div>
        <SoundToggle />
        <ThemeToggle />
      </div>
    </div>
  );
};

export default GameHeader;

