import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './Pick3Game.css';

function Pick3Game() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('pick3', {
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

  const numbers = Array.from({ length: 10 }, (_, i) => i);

  const toggleNumber = (num) => {
    if (isDrawing || result) return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 3) {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handlePlay = async () => {
    if (selectedNumbers.length !== 3) {
      showError('Please select exactly 3 numbers to play.');
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
        `${API_URL}/games/pick3/play`,
        { bet, selectedNumbers: selectedNumbers.sort((a, b) => a - b) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate drawing winning numbers
      const drawn = response.data.winningNumbers || [];
      for (let i = 0; i < drawn.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
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
    fetchUser();
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const quickPick = () => {
    if (isDrawing || result) return;
    const quick = [];
    while (quick.length < 3) {
      const num = Math.floor(Math.random() * 10);
      if (!quick.includes(num)) {
        quick.push(num);
      }
    }
    setSelectedNumbers(quick);
  };

  const isMatch = (num) => {
    return selectedNumbers.includes(num) && winningNumbers.includes(num);
  };

  return (
    <div className="game-container pick3-container">
      <GameHeader 
        title="🎯 Pick 3"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="pick3-game">
        <div className="pick3-game-layout">
          <div className="pick3-board">
            <h2>Select 3 Numbers (0-9)</h2>
            <div className="numbers-grid">
              {numbers.map(num => (
                <button
                  key={num}
                  className={`pick3-number ${
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
              Selected: {selectedNumbers.length}/3
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
                  <h3>Winning Numbers:</h3>
                  <div className="winning-numbers-display">
                    {winningNumbers.map((num, index) => (
                      <div
                        key={index}
                        className={`winning-ball ${isMatch(num) ? 'matched' : ''}`}
                        style={{ animationDelay: `${index * 0.2}s` }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pick3-controls">
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
              disabled={isDrawing || selectedNumbers.length !== 3 || user?.balance < bet}
              className="btn btn-primary btn-play"
            >
              {isDrawing ? 'Drawing...' : 'Play Pick 3'}
            </button>
          ) : (
            <div className="game-buttons-container">
              <button 
                onClick={handlePlay} 
                disabled={isDrawing || selectedNumbers.length !== 3 || user?.balance < bet}
                className="btn btn-primary btn-play"
              >
                {isDrawing ? 'Drawing...' : 'Play Pick 3'}
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
              ? `Matches: ${result.matches || 0}/3${result.multiplier ? ' | Multiplier: ' + result.multiplier + 'x' : ''} | You won!`
              : `Matches: ${result.matches || 0}/3 | Better luck next time!`,
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

export default Pick3Game;
