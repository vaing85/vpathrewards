import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './CrapsGame.css';

function CrapsGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('craps', {
    bet: 5,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betType, setBetType] = useState('pass');
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState([null, null]);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
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

  const handleNewGame = () => {
    setResult(null);
    setRolling(false);
    setDice([null, null]);
    setResultClosing(false);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const betTypes = [
    { value: 'pass', label: 'Pass Line', description: 'Win on 7 or 11', payout: '2:1' },
    { value: 'dontpass', label: "Don't Pass", description: 'Win on 2 or 3', payout: '2:1' },
    { value: 'field', label: 'Field', description: 'Win on 2,3,4,9,10,11,12', payout: '2:1 or 3:1' },
    { value: 'any7', label: 'Any 7', description: 'Win if sum is 7', payout: '5:1' },
    { value: 'any11', label: 'Any 11', description: 'Win if sum is 11', payout: '15:1' }
  ];

  const handleRoll = async () => {
    if (rolling || user.balance < bet) return;

    setRolling(true);
    setResult(null);
    setShowResultPopup(false);
    setNotificationTimer(5);
    setDice([null, null]);

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
      const response = await axios.post(`${API_URL}/games/craps/play`, {
        bet,
        betType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDice([response.data.die1, response.data.die2]);
      setResult({
        sum: response.data.sum,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.won
      });
      setShowResultPopup(true);
      await fetchUser();
      setRolling(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error rolling dice. Please try again.');
      setRolling(false);
    }
  };

  const renderDiceFace = (value) => {
    if (!value) return null;
    
    const dots = [];
    const positions = {
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]]
    };

    const pos = positions[value] || [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const isDot = pos.some(([r, c]) => r === i && c === j);
        dots.push(
          <div key={`${i}-${j}`} className={`dice-dot ${isDot ? 'active' : ''}`} />
        );
      }
    }
    return dots;
  };

  return (
    <div className="craps-game-container">
      <GameHeader 
        title="🎲 Craps"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="craps-game">
        <div className="craps-game-layout">
          <div className="craps-board">
            <div className="game-area">
              <div className="dice-table">
                <div className="dice-display">
                  <div className={`dice-wrapper ${rolling ? 'rolling' : ''}`}>
                    <div className="dice">
                      {dice[0] ? renderDiceFace(dice[0]) : <div className="dice-placeholder">?</div>}
                    </div>
                  </div>
                  <div className={`dice-wrapper ${rolling ? 'rolling' : ''}`}>
                    <div className="dice">
                      {dice[1] ? renderDiceFace(dice[1]) : <div className="dice-placeholder">?</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="craps-controls">
            <div className="controls-row">
              <div className="betting-section">
            <h3>Place Your Bet</h3>
            
            <div className="bet-type-section">
              <label>Bet Type</label>
              <div className="bet-type-buttons">
                {betTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    className={`bet-type-btn ${betType === type.value ? 'active' : ''}`}
                    onClick={() => setBetType(type.value)}
                    disabled={rolling}
                  >
                    <div className="bet-type-header">
                      <span className="bet-type-name">{type.label}</span>
                      <span className="bet-type-payout">{type.payout}</span>
                    </div>
                    <div className="bet-type-desc">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bet-options">
              {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                <button
                  key={amount}
                  className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                  onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                  disabled={rolling || amount > (user?.balance || 0)}
                >
                  ${amount}
                </button>
              ))}
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
                  disabled={bet <= 5 || rolling}
                >
                  −
                </button>
                <input
                  type="number"
                  id="craps-bet"
                  name="bet"
                  min="5"
                  max={Math.min(user?.balance || 0, 100)}
                  step="5"
                  value={bet}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 5;
                    const rounded = Math.max(5, Math.floor(value / 5) * 5);
                    setBet(Math.min(rounded, Math.min(user?.balance || 0, 100)));
                  }}
                  className="bet-input"
                  disabled={rolling}
                />
                <button
                  type="button"
                  className="bet-adjust-btn plus"
                  onClick={() => {
                    const newBet = Math.min(Math.min(user?.balance || 0, 100), bet + 5);
                    setBet(newBet);
                  }}
                  disabled={bet >= Math.min(user?.balance || 0, 100) || rolling}
                >
                  +
                </button>
              </div>
            </div>

            {!result ? (
              <button
                type="button"
                onClick={handleRoll}
                disabled={rolling || user?.balance < bet}
                className="roll-btn"
              >
                {rolling ? 'Rolling...' : '🎲 Roll Dice'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button
                  type="button"
                  onClick={handleRoll}
                  disabled={rolling || user?.balance < bet}
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
                  <p><strong>Objective:</strong> Roll two dice and bet on the outcome. Win by predicting the sum or specific combinations.</p>
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
                  className={`rules-tab ${rulesTab === 'bettypes' ? 'active' : ''}`}
                  onClick={() => setRulesTab('bettypes')}
                >
                  Bet Types
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
                      <li>Select a bet type from the options</li>
                      <li>Set your bet amount (minimum $5)</li>
                      <li>Click "Roll Dice" to roll two dice</li>
                      <li>The sum of the two dice determines if you win</li>
                      <li>Win based on your selected bet type and payout</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'bettypes' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Pass Line:</strong> Win if the sum is 7 or 11 on the first roll</li>
                      <li><strong>Don't Pass:</strong> Win if the sum is 2 or 3 on the first roll</li>
                      <li><strong>Field:</strong> Win if the sum is 2, 3, 4, 9, 10, 11, or 12</li>
                      <li><strong>Any 7:</strong> Win if the sum is exactly 7</li>
                      <li><strong>Any 11:</strong> Win if the sum is exactly 11</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Pass Line:</strong> 2:1 payout</li>
                      <li><strong>Don't Pass:</strong> 2:1 payout</li>
                      <li><strong>Field:</strong> 2:1 payout (3:1 for 2 or 12)</li>
                      <li><strong>Any 7:</strong> 5:1 payout</li>
                      <li><strong>Any 11:</strong> 15:1 payout</li>
                    </ul>
                  </div>
                )}
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
            ? `${result.sum ? 'Dice Sum: ' + result.sum + ' | ' : ''}You won!`
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

export default CrapsGame;
