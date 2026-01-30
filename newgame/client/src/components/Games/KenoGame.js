import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import KenoDrawChart from '../Dashboard/KenoDrawChart';
import './KenoGame.css';

function KenoGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('keno', { bet: 10 });
  const [bet, setBet] = useState(settings.bet);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [winningNumbers, setWinningNumbers] = useState([]);
  const [matches, setMatches] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet changes
  useEffect(() => {
    updateSettings({ bet });
  }, [bet, updateSettings]);

  const numbers = Array.from({ length: 80 }, (_, i) => i + 1);

  const toggleNumber = (num) => {
    if (gameActive || result) return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const quickPick = () => {
    if (gameActive || result) return;
    const count = Math.floor(Math.random() * 10) + 1; // Pick 1-10 numbers
    const quick = [];
    while (quick.length < count) {
      const num = Math.floor(Math.random() * 80) + 1;
      if (!quick.includes(num)) {
        quick.push(num);
      }
    }
    setSelectedNumbers(quick.sort((a, b) => a - b));
  };

  const clearSelection = () => {
    if (gameActive || result) return;
    setSelectedNumbers([]);
  };

  const handlePlay = async () => {
    if (selectedNumbers.length < 1) {
      showError('Please select at least 1 number to play.');
      return;
    }
    if (user.balance < bet) {
      showInsufficientBalance(bet, user.balance);
      return;
    }

    setIsDrawing(true);
    setWinningNumbers([]);
    setResult(null);
    setShowConfetti(false);

    try {
      const response = await axios.post(`${API_URL}/games/keno/play`, {
        bet,
        selectedNumbers
      });

      // Animate drawing winning numbers
      const drawn = response.data.winningNumbers || [];
      for (let i = 0; i < drawn.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setWinningNumbers(prev => [...prev, drawn[i]]);
      }

      setIsDrawing(false);
      setGameActive(false);
      const matchCount = response.data.matches || 0;
      setMatches(matchCount);
      const gameResult = {
        win: response.data.win > 0,
        won: response.data.win > 0,
        winAmount: response.data.win,
        bet: response.data.bet,
        matches: matchCount
      };
      setResult(gameResult);
      setShowResultPopup(true);

      if (response.data.win > 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      await fetchUser();
    } catch (error) {
      setIsDrawing(false);
      showError(error.response?.data?.message || 'Error playing Keno. Please try again.');
    }
  };

  const handleNewGame = () => {
    setSelectedNumbers([]);
    setWinningNumbers([]);
    setMatches(0);
    setResult(null);
    setShowConfetti(false);
    setShowResultPopup(false);
    fetchUser();
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
    // Keep winning numbers visible after closing popup
  };

  return (
    <div className="game-container">
      <GameHeader 
        title="🎫 Keno"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="keno-game">
        <KenoDrawChart />
        <div className="keno-game-layout">
          <div className="keno-board">
            <h2>Select 1-10 Numbers</h2>
            <div className="numbers-grid">
              {numbers.map(num => (
                <button
                  key={num}
                  className={`keno-number ${
                    selectedNumbers.includes(num) ? 'selected' : ''
                  } ${
                    winningNumbers.includes(num) ? 'winning' : ''
                  }`}
                  onClick={() => toggleNumber(num)}
                  disabled={gameActive || (!selectedNumbers.includes(num) && selectedNumbers.length >= 10)}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="selection-info">
              <div className="selection-count">
                Selected: {selectedNumbers.length}/10
                {selectedNumbers.length > 0 && (
                  <span className="selected-display">
                    {' '}→ {selectedNumbers.sort((a, b) => a - b).join(', ')}
                  </span>
                )}
              </div>
              <div className="selection-buttons">
                <button 
                  onClick={quickPick} 
                  className="btn btn-secondary quick-pick-btn"
                  disabled={gameActive || result}
                >
                  Quick Pick
                </button>
                {selectedNumbers.length > 0 && (
                  <button 
                    onClick={clearSelection} 
                    className="btn btn-secondary clear-btn"
                    disabled={gameActive || result}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {winningNumbers.length > 0 && (
            <div className="keno-winning-numbers-column">
              <h3>🎰 Winning Numbers (20 drawn):</h3>
              <div className="winning-numbers">
                {winningNumbers.map((num, index) => (
                  <span
                    key={num}
                    className={`winning-number ${
                      selectedNumbers.includes(num) ? 'matched' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {num}
                  </span>
                ))}
              </div>
              {selectedNumbers.length > 0 && (
                <div className="matches-info">
                  <strong>Matches: {matches} out of {selectedNumbers.length}</strong>
                </div>
              )}
            </div>
          )}

          <div className="keno-controls">
          {selectedNumbers.length > 0 && (
            <div className="payout-preview">
              <h4>Potential Winnings (${bet} bet):</h4>
              <div className="payout-info">
                {selectedNumbers.length <= 10 && (
                  <p>
                    {selectedNumbers.length} number{selectedNumbers.length > 1 ? 's' : ''} selected
                    {selectedNumbers.length === 1 && ' - Win 3x for 1 match'}
                    {selectedNumbers.length === 2 && ' - Win 12x for 2 matches'}
                    {selectedNumbers.length === 3 && ' - Win 42x for 3 matches'}
                    {selectedNumbers.length === 4 && ' - Win 100x for 4 matches'}
                    {selectedNumbers.length === 5 && ' - Win 800x for 5 matches'}
                    {selectedNumbers.length === 6 && ' - Win 1500x for 6 matches'}
                    {selectedNumbers.length === 7 && ' - Win 5000x for 7 matches'}
                    {selectedNumbers.length === 8 && ' - Win 10000x for 8 matches'}
                    {selectedNumbers.length === 9 && ' - Win 25000x for 9 matches'}
                    {selectedNumbers.length === 10 && ' - Win 100000x for 10 matches!'}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="bet-control">
            <label>Bet Amount:</label>
            <div className="bet-options">
              {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                <button
                  key={amount}
                  className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                  onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                  disabled={gameActive || result || amount > (user?.balance || 0)}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              id="keno-bet"
              name="bet"
              min="1"
              max={Math.min(user?.balance || 0, 100)}
              value={bet}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setBet(Math.min(value, Math.min(user?.balance || 0, 100)));
              }}
              className="bet-input"
              disabled={gameActive || result}
            />
          </div>

          {!result ? (
            <button
              onClick={handlePlay}
                disabled={isDrawing || selectedNumbers.length < 1 || user?.balance < bet}
                className="btn btn-primary"
              >
                {isDrawing ? 'Drawing...' : 'Play Keno'}
              </button>
          ) : (
            <button onClick={handleNewGame} className="btn btn-primary">
              New Game
            </button>
          )}
          </div>
        </div>

        <ResultOverlay
          result={result ? {
            win: result.win,
            won: result.won,
            message: result.win > 0 
              ? `${result.matches || matches} out of ${selectedNumbers.length} matches!`
              : `${result.matches || matches || 0} out of ${selectedNumbers.length} matches`,
            amount: result.win > 0 ? result.winAmount : -bet
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

export default KenoGame;

