import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './WheelGame.css';

function WheelGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('wheel', { bet: 10 });
  const [bet, setBet] = useState(settings.bet);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rotation, setRotation] = useState(0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet changes
  useEffect(() => {
    updateSettings({ bet });
  }, [bet, updateSettings]);

  const wheelSegments = [
    { value: 1, multiplier: 2, color: '#ff6b6b' },
    { value: 2, multiplier: 3, color: '#4ecdc4' },
    { value: 5, multiplier: 5, color: '#ffe66d' },
    { value: 10, multiplier: 10, color: '#a8e6cf' },
    { value: 20, multiplier: 20, color: '#ffd93d' },
    { value: 50, multiplier: 50, color: '#6c5ce7' },
    { value: 100, multiplier: 100, color: '#fd79a8' },
    { value: 0, multiplier: 0, color: '#636e72' } // Lose
  ];

  const handleSpin = async () => {
    if (spinning || !user || user.balance < bet) return;

    setSpinning(true);
    setResult(null);
    setShowResultPopup(false);
    setNotificationTimer(5);

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
        `${API_URL}/games/wheel/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Calculate final rotation based on result
      const segmentIndex = wheelSegments.findIndex(s => s.value === response.data.segment);
      const targetSegmentIndex = segmentIndex >= 0 ? segmentIndex : 7; // Default to LOSE segment (index 7)
      const segmentAngle = (360 / wheelSegments.length) * targetSegmentIndex;
      // Add multiple full spins (5 rotations) and position the segment at the top
      // The pointer is at 0deg (top), so we need to rotate so the segment center aligns with it
      const fullSpins = 5 * 360;
      const finalRotation = rotation + fullSpins + (360 - segmentAngle);
      setRotation(finalRotation);

      setResult({
        segment: response.data.segment,
        multiplier: response.data.multiplier,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.win > 0
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
    <div className="game-container">
      <GameHeader 
        title="🎡 Wheel of Fortune"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="wheel-game">
        <div className="wheel-game-layout">
          <div className="wheel-board">
            <div className="game-area">
              <div className="wheel-table">
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
                            {segment.value === 0 ? 'LOSE' : `×${segment.multiplier}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="wheel-pointer"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="wheel-controls-panel">
            <div className="betting-section">
              <h3>Place Your Bet</h3>
              <div className="bet-options">
                {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                    onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                    disabled={spinning || amount > (user?.balance || 0)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div className="bet-control">
                <label>Bet Amount:</label>
                <BetControls
                  bet={bet}
                  setBet={setBet}
                  balance={user?.balance || 0}
                  minBet={1}
                  maxBet={Math.min(user?.balance || 0, 100)}
                  step={1}
                  disabled={spinning || !user}
                  quickBetOptions={[5, 10, 25, 50, 100]}
                />
              </div>
              {!result ? (
                <div className="spin-button-container">
                  <button
                    onClick={handleSpin}
                    disabled={spinning || !user || user.balance < bet}
                    className="btn btn-primary spin-button"
                  >
                    {spinning ? 'Spinning...' : 'SPIN WHEEL'}
                  </button>
                </div>
              ) : (
                <div className="game-buttons-container">
                  <div className="spin-button-container">
                    <button
                      onClick={handleSpin}
                      disabled={spinning || !user || user.balance < bet}
                      className="btn btn-primary spin-button"
                    >
                      {spinning ? 'Spinning...' : 'SPIN WHEEL'}
                    </button>
                  </div>
                  <button 
                    onClick={handleNewGame} 
                    className="btn btn-primary btn-new-game-controls"
                  >
                    New Game
                  </button>
                </div>
              )}
            </div>

            <div className="wheel-info">
              <h3>Multipliers</h3>
              <div className="multiplier-list">
                {wheelSegments.map((segment, index) => (
                  <div key={index} className="multiplier-item" style={{ borderLeft: `4px solid ${segment.color}` }}>
                    <span className="multiplier-value">
                      {segment.value === 0 ? 'LOSE' : `×${segment.multiplier}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {result && showResultPopup && (
        <div 
          className={`result-overlay ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}
          onClick={(e) => {
            if (e.target.classList.contains('result-overlay')) {
              handleCloseResult();
            }
          }}
        >
          <div className={`result ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}>
            <button 
              className="result-close-btn"
              onClick={handleCloseResult}
              aria-label="Close"
            >
              ×
            </button>
            <div className="result-timer">
              {notificationTimer > 0 && (
                <span className="timer-countdown">{notificationTimer}s</span>
              )}
            </div>
            <div className="result-icon">
              {result.won && <span className="win-icon">🎉</span>}
              {!result.won && <span className="lose-icon">😔</span>}
            </div>
            <h2>{result.won ? 'You Won!' : 'Better Luck Next Time!'}</h2>
            {result.won ? (
              <>
                <p className="win-amount">Winnings: ${result.win?.toFixed(2)}</p>
                {result.multiplier && <p className="multiplier-display">Multiplier: ×{result.multiplier}</p>}
              </>
            ) : (
              <>
                <p className="lose-amount">You lost ${result.bet?.toFixed(2)}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WheelGame;

