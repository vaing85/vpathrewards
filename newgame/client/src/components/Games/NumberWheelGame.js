import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './NumberWheelGame.css';

function NumberWheelGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('numberwheel', { bet: 5 });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [number, setNumber] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet changes
  useEffect(() => {
    updateSettings({ bet });
  }, [bet, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const handleNewGame = () => {
    setResult(null);
    setSpinning(false);
    setNumber(null);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const handlePlay = async () => {
    if (bet > balance) {
      showInsufficientBalance(bet, balance);
      return;
    }

    setSpinning(true);
    setLoading(true);
    setNumber(null);
    setResult(null);
    setShowResultPopup(false);
    setNotificationTimer(5);
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/numberwheel/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate wheel spinning
      setTimeout(() => {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        setNumber(randomNumber);
        setSpinning(false);
      }, 2000);

      setTimeout(() => {
        setResult(response.data);
        setShowResultPopup(true);
        setBalance(response.data.balance);
        fetchUser();
      }, 2500);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="numberwheel-game-container">
      <GameHeader 
        title="🎡 Number Wheel"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="numberwheel-game">
        <div className="numberwheel-game-layout">
          <div className="numberwheel-board">
            <div className="number-area">
              <h3>Your Number</h3>
              <div className={`number-display ${spinning ? 'spinning' : ''}`}>
                {number !== null ? number : '?'}
              </div>
            </div>
          </div>

          <div className="numberwheel-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-options">
                  {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                      onClick={() => setBet(Math.min(amount, Math.min(balance, 100)))}
                      disabled={spinning || amount > balance}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <div className="bet-amount-section">
                  <BetControls
                    bet={bet}
                    setBet={setBet}
                    balance={balance}
                    minBet={5}
                    maxBet={Math.min(balance, 100)}
                    step={5}
                    disabled={spinning}
                    quickBetOptions={[5, 10, 15, 20, 25, 50, 100]}
                  />
                </div>

                {!result ? (
                  <button
                    onClick={handlePlay}
                    disabled={spinning || balance < bet}
                    className="play-btn"
                  >
                    {spinning || loading ? 'Spinning...' : '🎡 Spin'}
                  </button>
                ) : (
                  <div className="game-buttons-container">
                    <button
                      onClick={handlePlay}
                      disabled={spinning || balance < bet}
                      className="play-btn"
                    >
                      {spinning || loading ? 'Spinning...' : '🎡 Spin'}
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
                    <p><strong>Objective:</strong> Spin the number wheel and see where it lands! Win multipliers based on your luck.</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <div className="tab-panel">
                      <ul>
                        <li>Set your bet amount (minimum $5)</li>
                        <li>Click "Spin" to spin the number wheel</li>
                        <li>The wheel will land on a number</li>
                        <li>Win multipliers: 2x, 3x, 5x, 10x</li>
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
            ? `${result.multiplier ? result.multiplier + 'x Multiplier! ' : ''}You won!`
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

export default NumberWheelGame;
