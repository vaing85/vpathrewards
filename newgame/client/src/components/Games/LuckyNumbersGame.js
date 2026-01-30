import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './LuckyNumbersGame.css';

function LuckyNumbersGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('luckynumbers', {
    bet: 10
  });
  const [bet, setBet] = useState(settings.bet);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [winningNumbers, setWinningNumbers] = useState([]);
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

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const toggleNumber = (num) => {
    if (isDrawing || result) return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 6) {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handlePlay = async () => {
    if (selectedNumbers.length < 1) {
      showError('Please select at least 1 lucky number to play.');
      return;
    }
    if (user.balance < bet) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setIsDrawing(true);
    setWinningNumbers([]);
    setResult(null);
    setShowConfetti(false);
    setShowResultPopup(false);

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/luckynumbers/play`,
        { bet, selectedNumbers: selectedNumbers.sort((a, b) => a - b) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate drawing winning numbers
      const drawn = response.data.winningNumbers || [];
      for (let i = 0; i < drawn.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setWinningNumbers(prev => [...prev, drawn[i]]);
      }

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
    setSelectedNumbers([]);
    setWinningNumbers([]);
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
    const quick = [];
    const count = Math.min(6, Math.floor(Math.random() * 6) + 1);
    while (quick.length < count) {
      const num = Math.floor(Math.random() * 49) + 1;
      if (!quick.includes(num)) {
        quick.push(num);
      }
    }
    setSelectedNumbers(quick.sort((a, b) => a - b));
  };

  const isMatch = (num) => {
    return selectedNumbers.includes(num) && winningNumbers.includes(num);
  };

  return (
    <div className="game-container luckynumbers-container">
      <GameHeader 
        title="🍀 Lucky Numbers"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="luckynumbers-game">
        <div className="luckynumbers-game-layout">
          <div className="luckynumbers-board">
            <h2>Select Your Lucky Numbers (1-49)</h2>
            <p className="subtitle">Choose 1-6 numbers for better chances!</p>
            <div className="numbers-grid">
              {numbers.map(num => (
                <button
                  key={num}
                  className={`luckynumber-number ${
                    selectedNumbers.includes(num) ? 'selected' : ''
                  } ${
                    winningNumbers.includes(num) ? 'winning' : ''
                  } ${
                    isMatch(num) ? 'matched' : ''
                  }`}
                  onClick={() => toggleNumber(num)}
                  disabled={isDrawing || result}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="selection-info">
              Selected: {selectedNumbers.length}/6
              {selectedNumbers.length > 0 && (
                <span className="selected-display">
                  {' '}→ {selectedNumbers.sort((a, b) => a - b).join(', ')}
                </span>
              )}
            </div>
            {!result && (
              <button onClick={quickPick} className="btn btn-secondary quick-pick-btn" disabled={isDrawing}>
                Quick Pick
              </button>
            )}

            <div className="winning-numbers-section">
              {winningNumbers.length > 0 && (
                <>
                  <h3>🎰 Winning Numbers:</h3>
                  <div className="winning-numbers-display">
                    {winningNumbers.map((num, index) => (
                      <div
                        key={index}
                        className={`winning-ball ${isMatch(num) ? 'matched' : ''}`}
                        style={{ animationDelay: `${index * 0.15}s` }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="luckynumbers-controls">
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
                disabled={isDrawing || selectedNumbers.length < 1 || user?.balance < bet}
                className="btn btn-primary btn-play"
              >
                {isDrawing ? 'Drawing...' : 'Draw Lucky Numbers'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button 
                  onClick={handlePlay} 
                  disabled={isDrawing || selectedNumbers.length < 1 || user?.balance < bet}
                  className="btn btn-primary btn-play"
                >
                  {isDrawing ? 'Drawing...' : 'Draw Lucky Numbers'}
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
              ? `Matches: ${result.matches || 0}/${selectedNumbers.length}${result.multiplier ? ' | Multiplier: ' + result.multiplier + 'x' : ''} | Lucky you!`
              : `Matches: ${result.matches || 0}/${selectedNumbers.length} | Better luck next time!`,
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

export default LuckyNumbersGame;
