import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './Lucky7Game.css';

function Lucky7Game() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('lucky7', {
    bet: 5
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState([null, null]);
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

  const handleNewGame = () => {
    setResult(null);
    setRolling(false);
    setDice([null, null]);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const handleRoll = async () => {
    if (rolling || balance < bet) return;

    setRolling(true);
    setResult(null);
    setShowResultPopup(false);

    // Animate dice rolling
    const rollDuration = 2000;
    const rollInterval = 100;
    let elapsed = 0;

    const rollAnimation = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
      elapsed += rollInterval;
      if (elapsed >= rollDuration) {
        clearInterval(rollAnimation);
        performRoll();
      }
    }, rollInterval);
  };

  const performRoll = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/lucky7/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Generate random dice values for display (sum should be 7 for win)
      const sum = response.data.won ? 7 : Math.floor(Math.random() * 11) + 2;
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = sum - die1;
      const finalDie1 = die2 > 6 ? 6 : die1;
      const finalDie2 = die2 > 6 ? sum - 6 : die2;
      
      setDice([finalDie1, finalDie2]);
      setResult({
        die1: finalDie1,
        die2: finalDie2,
        sum: finalDie1 + finalDie2,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.won
      });
      setShowResultPopup(true);
      setBalance(response.data.balance);
      await fetchUser();
      setRolling(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error rolling dice. Please try again.');
      setRolling(false);
    }
  };

  const getDiceFace = (value) => {
    const faces = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅'
    };
    return faces[value] || '?';
  };


  return (
    <div className="lucky7-game-container">
      <GameHeader 
        title="🎲 Lucky 7"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="lucky7-game">
        <div className="lucky7-game-layout">
          <div className="lucky7-board">
            <div className="dice-area">
              <div className="dice-container">
                {dice.map((die, index) => (
                  <div key={index} className={`dice ${rolling ? 'rolling' : ''}`}>
                    {die ? getDiceFace(die) : '?'}
                  </div>
                ))}
              </div>
              {result && (
                <div className="dice-result">
                  <p>Sum: {result.sum} {result.sum === 7 && '🎰 Lucky 7!'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lucky7-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-options">
                  {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                      onClick={() => setBet(Math.min(amount, Math.min(balance, 100)))}
                      disabled={rolling || amount > balance}
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
                      disabled={bet <= 5 || rolling}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="lucky7-bet"
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
                      disabled={rolling}
                    />
                    <button 
                      className="bet-adjust-btn plus"
                      onClick={() => {
                        const newBet = Math.min(Math.min(balance, 100), bet + 5);
                        setBet(newBet);
                      }}
                      disabled={bet >= Math.min(balance, 100) || rolling}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!result ? (
                  <button
                    onClick={handleRoll}
                    disabled={rolling || balance < bet}
                    className="roll-btn"
                  >
                    {rolling ? 'Rolling...' : '🎲 Roll Dice'}
                  </button>
                ) : (
                  <div className="game-buttons-container">
                    <button
                      onClick={handleRoll}
                      disabled={rolling || balance < bet}
                      className="roll-btn"
                    >
                      {rolling ? 'Rolling...' : '🎲 Roll Dice'}
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
                    <p><strong>Objective:</strong> Roll two dice and bet on getting a sum of 7. Win big with the lucky 7!</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <div className="tab-panel">
                      <ul>
                        <li>Set your bet amount (minimum $5)</li>
                        <li>Click "Roll Dice" to roll two dice</li>
                        <li><strong>Lucky 7:</strong> Win if sum equals 7 (pays up to 50x)</li>
                        <li>Other sums may also win with lower multipliers</li>
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
            ? `Lucky 7! ${result.sum ? 'Dice Sum: ' + result.sum + ' | ' : ''}You won!`
            : `${result.sum ? 'Dice Sum: ' + result.sum + ' | ' : ''}Better luck next time!`,
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

export default Lucky7Game;
