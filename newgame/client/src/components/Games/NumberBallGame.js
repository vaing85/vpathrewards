import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './NumberBallGame.css';

function NumberBallGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('numberball', {
    bet: 10
  });
  const [bet, setBet] = useState(settings.bet);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [winningNumber, setWinningNumber] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
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

  const numbers = Array.from({ length: 36 }, (_, i) => i + 1);

  const handleSelectNumber = (num) => {
    if (isDrawing || result) return;
    setSelectedNumber(num);
  };

  const handlePlay = async () => {
    if (!selectedNumber) {
      showError('Please select a number to play.');
      return;
    }
    if (user.balance < bet) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setIsDrawing(true);
    setWinningNumber(null);
    setResult(null);
    setShowConfetti(false);
    setShowResultPopup(false);

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/numberball/play`,
        { bet, selectedNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate drawing winning number
      await new Promise(resolve => setTimeout(resolve, 1500));
      setWinningNumber(response.data.winningNumber);

      setIsDrawing(false);
      setResult(response.data);
      setShowResultPopup(true);
      
      if (response.data.win > 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      await fetchUser();
    } catch (error) {
      setIsDrawing(false);
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
    }
  };

  const handleNewGame = () => {
    setSelectedNumber(null);
    setWinningNumber(null);
    setResult(null);
    setShowConfetti(false);
    setShowResultPopup(false);
    setResultClosing(false);
    fetchUser();
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const quickPick = () => {
    if (isDrawing || result) return;
    const num = Math.floor(Math.random() * 36) + 1;
    setSelectedNumber(num);
  };

  return (
    <div className="game-container numberball-container">
      <GameHeader 
        title="⚽ Number Ball"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="numberball-game">
        <div className="numberball-game-layout">
          <div className="numberball-board">
            <h2>Select Your Number (1-36)</h2>
            <div className="numbers-grid">
              {numbers.map(num => (
                <button
                  key={num}
                  className={`numberball-number ${
                    selectedNumber === num ? 'selected' : ''
                  } ${
                    winningNumber === num ? 'winning' : ''
                  } ${
                    selectedNumber === num && winningNumber === num ? 'matched' : ''
                  }`}
                  onClick={() => handleSelectNumber(num)}
                  disabled={isDrawing || result}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="selection-info">
              {selectedNumber ? (
                <span>Selected: <strong className="selected-display">{selectedNumber}</strong></span>
              ) : (
                <span>No number selected</span>
              )}
            </div>
            {!result && (
              <button onClick={quickPick} className="btn btn-secondary quick-pick-btn" disabled={isDrawing}>
                Quick Pick
              </button>
            )}

            <div className="drawing-section">
              {isDrawing && (
                <div className="drawing-animation">
                  <div className="ball-machine">
                    <div className="spinning-balls">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="spinning-ball" style={{ animationDelay: `${i * 0.1}s` }}>
                          {Math.floor(Math.random() * 36) + 1}
                        </div>
                      ))}
                    </div>
                    <p>Drawing number...</p>
                  </div>
                </div>
              )}
              {winningNumber && !isDrawing && (
                <div className="winning-display">
                  <h3>Winning Number:</h3>
                  <div className={`winning-ball ${selectedNumber === winningNumber ? 'matched' : ''}`}>
                    {winningNumber}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="numberball-controls">
            <div className="bet-control">
              <label>Bet Amount:</label>
              <div className="bet-options">
                {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                    onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                    disabled={isDrawing || result || amount > (user?.balance || 0)}
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
                  disabled={isDrawing || result}
                />
              </div>
            </div>

            {!result ? (
              <button
                onClick={handlePlay}
                disabled={isDrawing || !selectedNumber || user?.balance < bet}
                className="btn btn-primary btn-play"
              >
                {isDrawing ? 'Drawing...' : 'Draw Ball'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button 
                  onClick={handlePlay} 
                  disabled={isDrawing || !selectedNumber || user?.balance < bet}
                  className="btn btn-primary btn-play"
                >
                  {isDrawing ? 'Drawing...' : 'Draw Ball'}
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
        </div>

        <ResultOverlay
          result={result ? {
            win: result.won,
            won: result.won,
            message: result.won 
              ? `Your number matched!${result.multiplier ? ' | Multiplier: ' + result.multiplier + 'x' : ''} | You won!`
              : `Winning number was ${winningNumber} | Better luck next time!`,
            amount: result.won ? result.win : -result.bet
          } : null}
          show={showResultPopup}
          onClose={handleCloseResult}
          autoCloseDelay={5}
          showTimer={true}
        />

        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NumberBallGame;
