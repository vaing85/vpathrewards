import React from 'react';
import './BetControls.css';

/**
 * Reusable bet controls component
 * @param {number} bet - Current bet amount
 * @param {function} setBet - Function to update bet
 * @param {number} balance - User's current balance
 * @param {number} minBet - Minimum bet allowed (default: 5)
 * @param {number} maxBet - Maximum bet allowed (default: 100)
 * @param {number} step - Bet increment/decrement step (default: 5)
 * @param {boolean} disabled - Whether controls are disabled (during game actions)
 * @param {array} quickBetOptions - Array of quick bet button values (default: [10, 25, 50, 100])
 */
const BetControls = ({
  bet,
  setBet,
  balance,
  minBet = 5,
  maxBet = 100,
  step = 5,
  disabled = false,
  quickBetOptions = [10, 25, 50, 100]
}) => {
  const handleDecrease = () => {
    setBet(Math.max(minBet, bet - step));
  };

  const handleIncrease = () => {
    setBet(Math.min(Math.min(balance, maxBet), bet + step));
  };

  const handleInputChange = (e) => {
    const value = Math.max(minBet, Math.min(maxBet, parseInt(e.target.value) || minBet));
    setBet(value);
  };

  const handleQuickBet = (amount) => {
    if (balance >= amount && amount <= maxBet) {
      setBet(Math.min(amount, maxBet));
    }
  };

  return (
    <div className="bet-controls-container">
      <div className="bet-display">
        <span className="bet-label">Bet Amount:</span>
        <span className="bet-amount">${bet}</span>
      </div>

      {quickBetOptions.length > 0 && (
        <div className="bet-options">
          {quickBetOptions
            .filter(amount => amount <= maxBet)
            .map(amount => (
              <button
                key={amount}
                type="button"
                className={`bet-option-btn ${bet === amount ? 'active' : ''} ${balance < amount ? 'disabled' : ''}`}
                onClick={() => handleQuickBet(amount)}
                disabled={disabled || balance < amount || amount > maxBet}
                aria-label={`Set bet to $${amount}${balance < amount ? ' (insufficient balance)' : ''}`}
                aria-pressed={bet === amount}
              >
                ${amount}
              </button>
            ))}
        </div>
      )}

      <div className="bet-amount-controls">
        <button
          type="button"
          className="bet-adjust-btn minus"
          onClick={handleDecrease}
          disabled={bet <= minBet || disabled}
          aria-label="Decrease bet"
        >
          −
        </button>
        <input
          type="number"
          min={minBet}
          max={maxBet}
          step={step}
          value={bet}
          onChange={handleInputChange}
          className="bet-input"
          disabled={disabled}
          aria-label={`Bet amount, current bet is $${bet}`}
          aria-valuemin={minBet}
          aria-valuemax={maxBet}
          aria-valuenow={bet}
        />
        <button
          type="button"
          className="bet-adjust-btn plus"
          onClick={handleIncrease}
          disabled={bet >= Math.min(balance, maxBet) || disabled || balance < bet + step}
          aria-label="Increase bet"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default BetControls;

