import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './ClassicSlotsGame.css';

function ClassicSlotsGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('classicslots', {
    bet: 5,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [reels, setReels] = useState(['?', '?', '?']);
  const [spinning, setSpinning] = useState(false);
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
    setSpinning(false);
    setReels(['?', '?', '?']);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];

  const handleSpin = async () => {
    if (spinning || balance < bet) return;

    setSpinning(true);
    setResult(null);
    setShowResultPopup(false);
    setReels(['?', '?', '?']);

    // Animate spinning
    const spinDuration = 2000;
    const spinInterval = 100;
    let elapsed = 0;

    const spinAnimation = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
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
        `${API_URL}/games/classicslots/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReels(response.data.reels || ['?', '?', '?']);
      setResult({
        reels: response.data.reels,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.win > 0,
        multiplier: response.data.multiplier
      });
      setShowResultPopup(true);
      setBalance(response.data.balance);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error spinning slots. Please try again.');
      setSpinning(false);
    }
  };

  return (
    <div className="classicslots-game-container">
      <GameHeader 
        title="🎰 Classic Slots"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="classicslots-main">
        <div className="slots-game-layout">
          <div className="left-column">
          <div className="game-area">
            <div className="slot-table">
              <div className="slot-machine">
                <div className="reels-container">
                  {reels.map((symbol, index) => (
                    <div key={index} className={`reel ${spinning ? 'spinning' : ''}`}>
                      <div className="symbol">{symbol}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
                  id="classicslots-bet"
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

            {!result ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning || balance < bet}
                className="spin-btn"
              >
                {spinning ? 'Spinning...' : '🎰 Spin Reels'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning || balance < bet}
                  className="spin-btn"
                >
                  {spinning ? 'Spinning...' : '🎰 Spin Reels'}
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

          <div className="right-column">
          <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Spin the reels and match symbols to win prizes. Three matching symbols win!</p>
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
                      <li>Click "Spin Reels" to spin the slot machine</li>
                      <li>Match three symbols to win</li>
                      <li>Different symbols have different payout multipliers</li>
                      <li>Higher value symbols pay more</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Three 7️⃣:</strong> Highest payout</li>
                      <li><strong>Three 💎:</strong> Very high payout</li>
                      <li><strong>Three ⭐:</strong> High payout</li>
                      <li><strong>Three 🔔:</strong> Medium payout</li>
                      <li><strong>Three Fruits:</strong> Standard payout</li>
                      <li><strong>Two Matching:</strong> Small payout</li>
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

export default ClassicSlotsGame;
