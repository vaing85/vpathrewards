import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './QuickDrawGame.css';

function QuickDrawGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('quickdraw', {
    bet: 5
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [number, setNumber] = useState(null);
  const [animating, setAnimating] = useState(false);
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

  const handlePlay = async () => {
    if (bet > balance) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setAnimating(true);
    setLoading(true);
    setNumber(null);
    setResult(null);
    setShowResultPopup(false);
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/quickdraw/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate number reveal
      setTimeout(() => {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        setNumber(randomNumber);
        setAnimating(false);
      }, 1000);

      setTimeout(() => {
        setResult(response.data);
        setShowResultPopup(true);
        setBalance(response.data.balance);
        fetchUser();
      }, 1500);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNewGame = () => {
    setResult(null);
    setAnimating(false);
    setNumber(null);
    setResultClosing(false);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  return (
    <div className="quickdraw-game-container">
      <GameHeader 
        title="⚡ Quick Draw"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="quickdraw-game">
        <div className="quickdraw-game-layout">
          <div className="quickdraw-board">
            <div className="number-area">
              <h3>Your Number</h3>
              <div className={`number-display ${animating ? 'animating' : ''}`}>
                {number !== null ? number : '?'}
              </div>
            </div>
          </div>

          <div className="quickdraw-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-options">
                  {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                      onClick={() => setBet(Math.min(amount, Math.min(balance, 100)))}
                      disabled={animating || amount > balance}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <div className="bet-amount-section">
                  <label>Bet Amount</label>
                  <div className="bet-amount-controls">
                    <button 
                      className="bet-adjust-btn minus"
                      onClick={() => {
                        const newBet = Math.max(5, bet - 5);
                        setBet(newBet);
                      }}
                      disabled={bet <= 5 || animating}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="quickdraw-bet"
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
                      disabled={animating}
                    />
                    <button 
                      className="bet-adjust-btn plus"
                      onClick={() => {
                        const newBet = Math.min(Math.min(balance, 100), bet + 5);
                        setBet(newBet);
                      }}
                      disabled={bet >= Math.min(balance, 100) || animating}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!result ? (
                  <button
                    onClick={handlePlay}
                    disabled={animating || balance < bet}
                    className="play-btn"
                  >
                    {animating || loading ? 'Drawing...' : '⚡ Play'}
                  </button>
                ) : (
                  <div className="game-buttons-container">
                    <button
                      onClick={handlePlay}
                      disabled={animating || balance < bet}
                      className="play-btn"
                    >
                      {animating || loading ? 'Drawing...' : '⚡ Play'}
                    </button>
                    <button 
                      onClick={handleNewGame} 
                      className="btn btn-primary btn-new-game-controls"
                    >
                      New Game
                    </button>
                  </div>
                )}
              </div>

              <div className="rules-section">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> Quick draw a number and see if you win! Fast-paced action with instant results.</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <div className="tab-panel">
                      <ul>
                        <li>Set your bet amount (minimum $5)</li>
                        <li>Click "Play" to quick draw a number</li>
                        <li>Your number determines the outcome</li>
                        <li>Win multipliers: 1x, 2x, 5x, 10x</li>
                        <li>Maximum bet: $100</li>
                      </ul>
                    </div>
                  </div>
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

export default QuickDrawGame;
