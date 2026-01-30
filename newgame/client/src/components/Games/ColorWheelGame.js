import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './ColorWheelGame.css';

function ColorWheelGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('colorwheel', {
    bet: 5,
    betOn: 'red',
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betOn, setBetOn] = useState(settings.betOn);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [balance, setBalance] = useState(user?.balance || 0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, betOn, rulesTab });
  }, [bet, betOn, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const wheelSegments = [
    { color: 'red', multiplier: 2, value: 'red', label: 'RED' },
    { color: 'black', multiplier: 2, value: 'black', label: 'BLACK' },
    { color: 'green', multiplier: 3, value: 'green', label: 'GREEN' },
    { color: 'red', multiplier: 2, value: 'red', label: 'RED' },
    { color: 'black', multiplier: 2, value: 'black', label: 'BLACK' },
    { color: 'green', multiplier: 3, value: 'green', label: 'GREEN' }
  ];

  const handleSpin = async () => {
    if (spinning || balance < bet) return;

    setSpinning(true);
    setResult(null);

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
        `${API_URL}/games/colorwheel/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Calculate final rotation - simulate landing on a color
      const won = response.data.win > 0;
      const landedColor = won ? betOn : (betOn === 'red' ? 'black' : 'red');
      const segmentIndex = wheelSegments.findIndex(s => s.value === landedColor);
      const segmentAngle = (360 / wheelSegments.length) * segmentIndex;
      const finalRotation = rotation + (360 * 5) - segmentAngle;
      setRotation(finalRotation);

      setResult({
        color: landedColor,
        multiplier: response.data.multiplier,
        win: response.data.win,
        bet: response.data.bet,
        won: won
      });
      setBalance(response.data.balance);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error spinning wheel. Please try again.');
      setSpinning(false);
    }
  };

  const getColorValue = (color) => {
    switch(color) {
      case 'red': return '#ef4444';
      case 'black': return '#1f2937';
      case 'green': return '#22c55e';
      default: return '#636e72';
    }
  };

  return (
    <div className="colorwheel-game-container">
      <GameHeader 
        title="🎨 Color Wheel"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="colorwheel-main">
        <div className="colorwheel-game-layout">
          <div className="colorwheel-board">
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
                            backgroundColor: getColorValue(segment.color)
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
            </div>
          </div>

          <div className="colorwheel-controls">
            <div className="betting-section">
            <h3>Place Your Bet</h3>
            
            <div className="bet-type-section">
              <label>Bet On Color</label>
              <div className="bet-type-buttons">
                <button
                  type="button"
                  className={`bet-type-btn red ${betOn === 'red' ? 'active' : ''}`}
                  onClick={() => setBetOn('red')}
                  disabled={spinning}
                >
                  <span className="color-indicator red"></span>
                  <span className="bet-type-name">Red</span>
                  <span className="bet-type-payout">2:1</span>
                </button>
                <button
                  type="button"
                  className={`bet-type-btn black ${betOn === 'black' ? 'active' : ''}`}
                  onClick={() => setBetOn('black')}
                  disabled={spinning}
                >
                  <span className="color-indicator black"></span>
                  <span className="bet-type-name">Black</span>
                  <span className="bet-type-payout">2:1</span>
                </button>
                <button
                  type="button"
                  className={`bet-type-btn green ${betOn === 'green' ? 'active' : ''}`}
                  onClick={() => setBetOn('green')}
                  disabled={spinning}
                >
                  <span className="color-indicator green"></span>
                  <span className="bet-type-name">Green</span>
                  <span className="bet-type-payout">3:1</span>
                </button>
              </div>
            </div>

            <div className="bet-amount-section">
              <label>Bet Amount</label>
              <div className="bet-amount-controls">
                <button
                  type="button"
                  className="bet-adjust-btn minus"
                  onClick={() => {
                    const newBet = Math.max(5, bet - 5);
                    setBet(newBet);
                  }}
                  disabled={bet <= 5 || spinning}
                >
                  −
                </button>
                <input
                  type="number"
                  id="colorwheel-bet"
                  name="bet"
                  min="5"
                  max={Math.min(balance, 100)}
                  step="5"
                  value={bet}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 5;
                    const rounded = Math.max(5, Math.floor(value / 5) * 5);
                    setBet(Math.min(rounded, Math.min(balance, 100)));
                  }}
                  className="bet-input"
                  disabled={spinning}
                />
                <button
                  type="button"
                  className="bet-adjust-btn plus"
                  onClick={() => {
                    const newBet = Math.min(Math.min(balance, 100), bet + 5);
                    setBet(newBet);
                  }}
                  disabled={bet >= Math.min(balance, 100) || spinning}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning || balance < bet}
              className="spin-btn"
            >
              {spinning ? 'Spinning...' : '🎨 Spin Wheel'}
            </button>
          </div>

          <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Bet on a color (Red, Black, or Green) and spin the wheel. Win if the wheel lands on your chosen color.</p>
              </div>
              
              <div className="rules-tabs">
                <button
                  type="button"
                  className={`rules-tab ${rulesTab === 'howtoplay' ? 'active' : ''}`}
                  onClick={() => setRulesTab('howtoplay')}
                >
                  How to Play
                </button>
                <button
                  type="button"
                  className={`rules-tab ${rulesTab === 'payouts' ? 'active' : ''}`}
                  onClick={() => setRulesTab('payouts')}
                >
                  Payouts
                </button>
              </div>

              <div className="rules-tab-content">
                {rulesTab === 'howtoplay' && (
                  <div className="tab-panel">
                    <ul>
                      <li>Choose a color to bet on (Red, Black, or Green)</li>
                      <li>Set your bet amount (minimum $5)</li>
                      <li>Click "Spin Wheel" to spin the color wheel</li>
                      <li>Win if the wheel lands on your chosen color</li>
                      <li>Payout depends on the color you bet on</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Red:</strong> 2:1 payout (double your bet)</li>
                      <li><strong>Black:</strong> 2:1 payout (double your bet)</li>
                      <li><strong>Green:</strong> 3:1 payout (triple your bet)</li>
                    </ul>
                  </div>
                )}
              </div>
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
            ? `Landed on: ${result.color?.toUpperCase()} | You won!`
            : `Landed on: ${result.color?.toUpperCase()} | Better luck next time!`,
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

export default ColorWheelGame;
