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
import './MultiLineSlotsGame.css';

function MultiLineSlotsGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('multilineslots', {
    bet: 5,
    paylines: 5,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [paylines, setPaylines] = useState(settings.paylines);
  const [reels, setReels] = useState([
    ['?', '?', '?'],
    ['?', '?', '?'],
    ['?', '?', '?']
  ]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [balance, setBalance] = useState(user?.balance || 0);
  
  const availablePaylines = [1, 3, 5, 9]; // Available payline options
  const totalBet = bet * paylines; // Total bet = bet per line × number of lines
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, paylines, rulesTab });
  }, [bet, paylines, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('multilineslots_settings', JSON.stringify({ bet, paylines, rulesTab }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [bet, paylines, rulesTab]);

  const handleNewGame = () => {
    setResult(null);
    setSpinning(false);
    setReels([
      ['?', '?', '?'],
      ['?', '?', '?'],
      ['?', '?', '?']
    ]);
    setShowResultPopup(false);
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const symbols = ['🎯', '🎲', '🎪', '🎨', '🎭', '🎬', '🎤', '🎧'];

  const handleSpin = async () => {
    if (spinning || balance < totalBet) return;

    setSpinning(true);
    setResult(null);
    setShowResultPopup(false);
    setReels([
      ['?', '?', '?'],
      ['?', '?', '?'],
      ['?', '?', '?']
    ]);

    const spinDuration = 2000;
    const spinInterval = 100;
    let elapsed = 0;

    const spinAnimation = setInterval(() => {
      setReels([
        [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ],
        [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ],
        [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ]
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
        `${API_URL}/games/multilineslots/play`,
        { bet, paylines },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Backend returns 3x3 grid
      const reelsGrid = response.data.reels || [
        ['?', '?', '?'],
        ['?', '?', '?'],
        ['?', '?', '?']
      ];
      setReels(reelsGrid);
      setResult({
        reels: reelsGrid,
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
        title="🎯 Multi-Line Slots"
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
                  <div className="multiline-reels-container">
                    {reels.map((row, rowIndex) => (
                      <div key={rowIndex} className="reels-row">
                        {row.map((symbol, colIndex) => (
                          <div key={colIndex} className={`reel ${spinning ? 'spinning' : ''}`}>
                            <div className="symbol">{symbol}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          <div className="betting-section">
            <h3>Place Your Bet</h3>
            
            <div className="paylines-section">
              <label>Number of Paylines</label>
              <div className="paylines-buttons">
                {availablePaylines.map((lineCount) => (
                  <button
                    key={lineCount}
                    type="button"
                    className={`payline-btn ${paylines === lineCount ? 'active' : ''}`}
                    onClick={() => {
                      if (!spinning && (bet * lineCount) <= balance) {
                        setPaylines(lineCount);
                      }
                    }}
                    disabled={spinning || (bet * lineCount) > balance}
                  >
                    {lineCount} {lineCount === 1 ? 'Line' : 'Lines'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bet-amount-section">
              <label>Bet Per Line</label>
              <div className="bet-amount-controls">
                <button
                  type="button"
                  className="bet-adjust-btn minus"
                  onClick={() => {
                    const newBet = Math.max(5, bet - 5);
                    if ((newBet * paylines) <= balance) {
                      setBet(newBet);
                    }
                  }}
                  disabled={bet <= 5 || spinning || (bet * paylines) > balance}
                >
                  −
                </button>
                <input
                  type="number"
                  id="multilineslots-bet"
                  name="bet"
                  min="5"
                  max={Math.min(Math.floor(balance / paylines), Math.floor(100 / paylines))}
                  step="5"
                  value={bet}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 5;
                    const rounded = Math.max(5, Math.floor(value / 5) * 5);
                    const maxBet = Math.min(Math.floor(balance / paylines), Math.floor(100 / paylines));
                    setBet(Math.min(rounded, maxBet));
                  }}
                  className="bet-input"
                  disabled={spinning}
                />
                <button
                  type="button"
                  className="bet-adjust-btn plus"
                  onClick={() => {
                    const maxBet = Math.min(Math.floor(balance / paylines), Math.floor(100 / paylines));
                    const newBet = Math.min(maxBet, bet + 5);
                    setBet(newBet);
                  }}
                  disabled={bet >= Math.min(Math.floor(balance / paylines), Math.floor(100 / paylines)) || spinning}
                >
                  +
                </button>
              </div>
            </div>

            <div className="total-bet-display">
              <div className="total-bet-label">Total Bet:</div>
              <div className="total-bet-amount">${totalBet.toFixed(2)}</div>
              <div className="total-bet-breakdown">({paylines} lines × ${bet.toFixed(2)})</div>
            </div>

            {!result ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={spinning || balance < totalBet}
                className="spin-btn"
              >
                {spinning ? 'Spinning...' : '🎰 Spin Reels'}
              </button>
            ) : (
              <div className="game-buttons-container">
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={spinning || balance < totalBet}
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
                <p><strong>Objective:</strong> Select paylines, set your bet per line, and spin to match symbols across multiple paylines to win prizes!</p>
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
                      <li>Select number of paylines (1, 3, 5, or 9)</li>
                      <li>Set your bet per line (minimum $5)</li>
                      <li>Total bet = bet per line × number of paylines</li>
                      <li>Click "Spin Reels" to spin the slot machine</li>
                      <li>Match symbols on active paylines to win</li>
                      <li>More paylines = more winning opportunities</li>
                      <li>Wins are calculated per active payline</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Three 🎯:</strong> Highest payout</li>
                      <li><strong>Three 🎲:</strong> Very high payout</li>
                      <li><strong>Three 🎪:</strong> High payout</li>
                      <li><strong>Three 🎨:</strong> Medium payout</li>
                      <li><strong>Three Common Symbols:</strong> Standard payout</li>
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

export default MultiLineSlotsGame;
