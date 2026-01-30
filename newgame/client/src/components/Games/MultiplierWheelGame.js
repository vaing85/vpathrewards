import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './MultiplierWheelGame.css';

function MultiplierWheelGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('multiplierwheel', {
    bet: 10
  });
  const [bet, setBet] = useState(settings.bet);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [balance, setBalance] = useState(user?.balance || 0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet });
  }, [bet, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const wheelSegments = [
    { multiplier: 2, color: '#ff6b6b', label: '×2' },
    { multiplier: 3, color: '#4ecdc4', label: '×3' },
    { multiplier: 5, color: '#ffe66d', label: '×5' },
    { multiplier: 10, color: '#a8e6cf', label: '×10' },
    { multiplier: 20, color: '#ffd93d', label: '×20' },
    { multiplier: 0, color: '#636e72', label: 'LOSE' }
  ];

  const handleSpin = async () => {
    if (spinning || user.balance < bet) return;

    setSpinning(true);
    setResult(null);
    setShowResultPopup(false);

    // Animate spinning
    const spinDuration = 3000;
    const spinInterval = 50;
    let elapsed = 0;

    const spinAnimation = setInterval(() => {
      setRotation(prev => prev + 45);
      elapsed += spinInterval;
      if (elapsed >= spinDuration) {
        clearInterval(spinAnimation);
        performSpin();
      }
    }, spinInterval);
  };

  const performSpin = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/multiplierwheel/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Handle response - if no multiplier, it's a loss (multiplier 0)
      const multiplier = response.data.multiplier !== undefined ? response.data.multiplier : 0;
      const win = response.data.win || 0;
      
      // Calculate final rotation based on result
      // Each segment is 60deg (360/6), and we want the winning segment to align with the pointer at top (0deg)
      const segmentIndex = wheelSegments.findIndex(s => s.multiplier === multiplier);
      const targetSegmentIndex = segmentIndex >= 0 ? segmentIndex : 5; // Default to LOSE segment
      const segmentAngle = (360 / wheelSegments.length) * targetSegmentIndex;
      // Add multiple full spins (5 rotations) and position the segment at the top
      // The pointer is at 0deg (top), so we need to rotate so the segment center aligns with it
      const fullSpins = 5 * 360;
      const finalRotation = rotation + fullSpins + (360 - segmentAngle);
      setRotation(finalRotation);

      setResult({
        multiplier: multiplier,
        win: win,
        bet: response.data.bet || bet,
        won: win > 0
      });
      setShowResultPopup(true);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error spinning wheel. Please try again.');
      setSpinning(false);
    }
  };

  const handleNewGame = () => {
    setResult(null);
    setSpinning(false);
    setRotation(0);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  return (
    <div className="game-container multiplierwheel-container">
      <GameHeader 
        title="🎡 Multiplier Wheel"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="multiplierwheel-game">
        <div className="multiplierwheel-layout">
          <div className="multiplierwheel-board">
            <div className="wheel-container">
              <div 
                className={`wheel ${spinning ? 'spinning' : ''}`}
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {wheelSegments.map((segment, index) => {
                  const angle = (360 / wheelSegments.length) * index;
                  return (
                    <div
                      key={index}
                      className="wheel-segment"
                      style={{
                        transform: `rotate(${angle}deg)`,
                        backgroundColor: segment.color
                      }}
                    >
                      <div className="segment-content">
                        {segment.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="wheel-pointer"></div>
            </div>
          </div>

          <div className="multiplierwheel-controls">
            <div className="bet-control">
              <label>Bet Amount:</label>
              <div className="bet-options">
                {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                    onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                    disabled={spinning || result || amount > (user?.balance || 0)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div className="bet-input-group">
                <input
                  type="number"
                  min="1"
                  max={Math.min(user?.balance || 0, 100)}
                  value={bet}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setBet(Math.min(value, Math.min(user?.balance || 0, 100)));
                  }}
                  className="bet-input"
                  disabled={spinning || result}
                />
              </div>
            </div>

            {!result ? (
              <button
                onClick={handleSpin}
                disabled={spinning || user?.balance < bet}
                className="btn btn-primary spin-button"
              >
                {spinning ? 'Spinning...' : 'SPIN WHEEL'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button
                  onClick={handleSpin}
                  disabled={spinning || user?.balance < bet}
                  className="btn btn-primary spin-button"
                >
                  {spinning ? 'Spinning...' : 'SPIN WHEEL'}
                </button>
                <button 
                  onClick={handleNewGame} 
                  className="btn btn-primary btn-new-game-controls"
                >
                  New Game
                </button>
              </div>
            )}

            <div className="multiplier-info">
              <h3>Multipliers</h3>
              <div className="multiplier-list">
                {wheelSegments.map((segment, index) => (
                  <div key={index} className="multiplier-item" style={{ borderLeft: `4px solid ${segment.color}` }}>
                    <span className="multiplier-value">{segment.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResultOverlay
        result={result ? {
          win: result.won,
          won: result.won,
          message: result.won 
            ? `${result.multiplier ? 'Multiplier: ×' + result.multiplier + ' | ' : ''}You won!`
            : 'Better luck next time!',
          amount: result.won ? result.win : -result.bet
        } : null}
        show={showResultPopup}
        onClose={handleCloseResult}
        autoCloseDelay={5}
        showTimer={true}
      />
    </div>
  );
}

export default MultiplierWheelGame;
