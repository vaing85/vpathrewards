import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './LotteryDrawGame.css';

function LotteryDrawGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('lotterydraw', {
    bet: 10
  });
  const [bet, setBet] = useState(settings.bet);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gameActive, setGameActive] = useState(false);
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

  const handlePlay = async () => {
    if (user.balance < bet) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setGameActive(true);
    setIsDrawing(true);
    setDrawnNumbers([]);
    setResult(null);
    setShowConfetti(false);
    setShowResultPopup(false);

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/lotterydraw/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate drawing numbers
      const winningNumbers = response.data.winningNumbers || [];
      for (let i = 0; i < winningNumbers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setDrawnNumbers(prev => [...prev, winningNumbers[i]]);
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
      setGameActive(false);
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
    }
  };

  const handleNewGame = () => {
    setDrawnNumbers([]);
    setResult(null);
    setGameActive(false);
    setShowConfetti(false);
    setShowResultPopup(false);
    fetchUser();
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  return (
    <div className="game-container lottery-container">
      <GameHeader 
        title="🎰 Lottery Draw"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="lottery-game">
        <div className="lottery-drum">
          <h2>Lottery Numbers</h2>
          <div className="drum-container">
            {drawnNumbers.length === 0 && !isDrawing && (
              <div className="drum-placeholder">
                <div className="drum-spinner">🎰</div>
                <p>Ready to draw!</p>
              </div>
            )}
            {isDrawing && drawnNumbers.length === 0 && (
              <div className="drum-spinning">
                <div className="spinner">🎰</div>
                <p>Drawing numbers...</p>
              </div>
            )}
            <div className="drawn-numbers-display">
              {drawnNumbers.map((num, index) => (
                <div
                  key={index}
                  className={`lottery-ball ${result?.winningNumbers?.includes(num) ? 'winning' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lottery-controls">
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
                disabled={gameActive || result}
              />
            </div>
          </div>

          {!result ? (
            <button
              onClick={handlePlay}
              disabled={isDrawing || user?.balance < bet}
              className="btn btn-primary btn-draw"
            >
              {isDrawing ? 'Drawing...' : 'Draw Numbers'}
            </button>
          ) : (
            <div className="game-buttons-container">
              <button 
                onClick={handlePlay} 
                disabled={isDrawing || user?.balance < bet}
                className="btn btn-primary btn-draw"
              >
                {isDrawing ? 'Drawing...' : 'Draw Numbers'}
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

        <ResultOverlay
          result={result ? {
            win: result.won,
            won: result.won,
            message: result.won 
              ? `${result.multiplier ? 'Multiplier: ' + result.multiplier + 'x | ' : ''}You won!`
              : 'Better luck next time!',
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

export default LotteryDrawGame;
