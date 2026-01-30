import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './BigSixGame.css';

function BigSixGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('bigsix', {
    bet: 5,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [balance, setBalance] = useState(user?.balance || 0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, rulesTab });
  }, [bet, rulesTab, updateSettings]);

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
    { value: 1, multiplier: 1, color: '#ff6b6b', label: '$1' },
    { value: 2, multiplier: 2, color: '#4ecdc4', label: '$2' },
    { value: 5, multiplier: 5, color: '#ffe66d', label: '$5' },
    { value: 10, multiplier: 10, color: '#a8e6cf', label: '$10' },
    { value: 20, multiplier: 20, color: '#ffd93d', label: '$20' },
    { value: 0, multiplier: 0, color: '#636e72', label: 'LOSE' }
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
        `${API_URL}/games/bigsix/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Calculate final rotation based on result
      const segmentIndex = wheelSegments.findIndex(s => s.multiplier === response.data.multiplier);
      const segmentAngle = (360 / wheelSegments.length) * segmentIndex;
      const finalRotation = rotation + (360 * 5) - segmentAngle; // 5 full spins
      setRotation(finalRotation);

      setResult({
        multiplier: response.data.multiplier,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.win > 0
      });
      setBalance(response.data.balance);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error spinning wheel. Please try again.');
      setSpinning(false);
    }
  };

  return (
    <div className="bigsix-game-container">
      <GameHeader 
        title="🎡 Big Six Wheel"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="bigsix-main">
        <div className="bigsix-game-layout">
          <div className="bigsix-board">
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

          <div className="bigsix-controls">
            <div className="betting-section">
            <h3>Place Your Bet</h3>
            
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
                  id="bigsix-bet"
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
              {spinning ? 'Spinning...' : '🎡 Spin Wheel'}
            </button>
          </div>

          <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Spin the Big Six wheel and win prizes based on the multiplier you land on.</p>
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
                      <li>Set your bet amount (minimum $5)</li>
                      <li>Click "Spin Wheel" to spin the Big Six wheel</li>
                      <li>The wheel will spin and land on a multiplier</li>
                      <li>Win your bet multiplied by the landed multiplier</li>
                      <li>If you land on "LOSE", you lose your bet</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>$1 Segment:</strong> 1x your bet</li>
                      <li><strong>$2 Segment:</strong> 2x your bet</li>
                      <li><strong>$5 Segment:</strong> 5x your bet</li>
                      <li><strong>$10 Segment:</strong> 10x your bet</li>
                      <li><strong>$20 Segment:</strong> 20x your bet</li>
                      <li><strong>LOSE Segment:</strong> Lose your bet</li>
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

export default BigSixGame;
