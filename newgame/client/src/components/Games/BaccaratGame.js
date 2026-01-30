import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './BaccaratGame.css';

function BaccaratGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('baccarat', {
    bet: 10,
    betOn: 'player',
    rulesTab: 'cardvalues'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betOn, setBetOn] = useState(settings.betOn);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab); // 'cardvalues', 'betting', or 'payouts'
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [cards, setCards] = useState({ playerCards: [], bankerCards: [] });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, betOn, rulesTab });
  }, [bet, betOn, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const handlePlay = async () => {
    if (bet > balance) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setDealing(true);
    setLoading(true);
    setAnimatingCards([]);
    setCards({ playerCards: [], bankerCards: [] });
    setResult(null);
    setShowResultPopup(false);
    setResultClosing(false);
    setNotificationTimer(5);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/baccarat/play`,
        { bet, betOn },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate dealing player cards
      setTimeout(() => {
        setCards({ playerCards: [response.data.playerCards[0]], bankerCards: [] });
        setAnimatingCards(['player-0']);
      }, 300);

      setTimeout(() => {
        setCards({ playerCards: response.data.playerCards, bankerCards: [] });
        setAnimatingCards(['player-0', 'player-1']);
      }, 600);

      // Animate dealing banker cards
      setTimeout(() => {
        setCards({ playerCards: response.data.playerCards, bankerCards: [response.data.bankerCards[0]] });
        setAnimatingCards(['player-0', 'player-1', 'banker-0']);
      }, 900);

      setTimeout(() => {
        setCards({ playerCards: response.data.playerCards, bankerCards: response.data.bankerCards });
        setAnimatingCards(['player-0', 'player-1', 'banker-0', 'banker-1']);
      }, 1200);

      // Show result after all cards are dealt
      setTimeout(() => {
        setResult(response.data);
        setBalance(response.data.balance);
        setDealing(false);
        setAnimatingCards([]);
        setShowResultPopup(true);
        fetchUser();
      }, 1800);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setDealing(false);
      setAnimatingCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  return (
    <div className="game-container">
      <GameHeader 
        title="🎴 Baccarat"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="baccarat-table">
        <div className="table-layout">
          <div className="game-column">
            <div className="table-felt">
              <div className="game-area">
                {(result || cards.playerCards.length > 0 || cards.bankerCards.length > 0) ? (
                  <div className="cards-display">
                    <div className="player-cards">
                      <h3>Player</h3>
                      <div className="cards-row">
                        {cards.playerCards.map((card, index) => {
                          const suitColor = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
                          const isAnimating = animatingCards.includes(`player-${index}`);
                          return (
                            <div key={index} className={`card ${isAnimating ? 'dealing' : ''} ${suitColor}`}>
                              <div className="card-inner">
                                <div className="card-corner card-top">
                                  <div className="card-rank">{card.rank}</div>
                                  <div className="card-suit">{card.suit}</div>
                                </div>
                                <div className="card-center">
                                  <div className={`card-suit-large ${suitColor}`}>{card.suit}</div>
                                </div>
                                <div className="card-corner card-bottom">
                                  <div className="card-rank">{card.rank}</div>
                                  <div className="card-suit">{card.suit}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {result && <div className="total">{result.playerTotal}</div>}
                    </div>
                    <div className="banker-cards">
                      <h3>Banker</h3>
                      <div className="cards-row">
                        {cards.bankerCards.map((card, index) => {
                          const suitColor = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
                          const isAnimating = animatingCards.includes(`banker-${index}`);
                          return (
                            <div key={index} className={`card ${isAnimating ? 'dealing' : ''} ${suitColor}`}>
                              <div className="card-inner">
                                <div className="card-corner card-top">
                                  <div className="card-rank">{card.rank}</div>
                                  <div className="card-suit">{card.suit}</div>
                                </div>
                                <div className="card-center">
                                  <div className={`card-suit-large ${suitColor}`}>{card.suit}</div>
                                </div>
                                <div className="card-corner card-bottom">
                                  <div className="card-rank">{card.rank}</div>
                                  <div className="card-suit">{card.suit}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {result && <div className="total">{result.bankerTotal}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="game-placeholder">
                    <p>Select your bet and click Play</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ResultOverlay
            result={result ? {
              win: result.win > 0,
              won: result.win > 0,
              message: result.win > 0 
                ? `Player: ${result.playerTotal} | Banker: ${result.bankerTotal}`
                : `Player: ${result.playerTotal} | Banker: ${result.bankerTotal}`,
              amount: result.win > 0 ? result.win : -result.bet
            } : null}
            show={showResultPopup}
            onClose={handleCloseResult}
            autoCloseDelay={5}
            showTimer={true}
          />

          <div className="betting-column">
            <div className="betting-area">
              <div className="game-rules">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> Bet on Player, Banker, or Tie.</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <button 
                      className={`rules-tab ${rulesTab === 'cardvalues' ? 'active' : ''}`}
                      onClick={() => setRulesTab('cardvalues')}
                      type="button"
                    >
                      Card Values
                    </button>
                    <button 
                      className={`rules-tab ${rulesTab === 'betting' ? 'active' : ''}`}
                      onClick={() => setRulesTab('betting')}
                      type="button"
                    >
                      Scoring
                    </button>
                    <button 
                      className={`rules-tab ${rulesTab === 'payouts' ? 'active' : ''}`}
                      onClick={() => setRulesTab('payouts')}
                      type="button"
                    >
                      Payouts
                    </button>
                  </div>

                  <div className="rules-tab-content">
                    {rulesTab === 'cardvalues' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Aces: 1</li>
                          <li>2-9: Face value</li>
                          <li>10, J, Q, K: 0</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'betting' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Hands are scored by last digit</li>
                          <li>Highest total wins</li>
                          <li>Natural 8 or 9 wins immediately</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'payouts' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Player: 1:1</li>
                          <li>Banker: 1:1 (5% commission)</li>
                          <li>Tie: 8:1</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="betting-controls">
                <div className="bet-on-section">
                  <h4>Bet On</h4>
                  <div className="bet-options">
                    <button 
                      className={`bet-option-btn ${betOn === 'player' ? 'active' : ''}`} 
                      onClick={() => setBetOn('player')}
                    >
                      Player
                    </button>
                    <button 
                      className={`bet-option-btn ${betOn === 'banker' ? 'active' : ''}`} 
                      onClick={() => setBetOn('banker')}
                    >
                      Banker
                    </button>
                    <button 
                      className={`bet-option-btn ${betOn === 'tie' ? 'active' : ''}`} 
                      onClick={() => setBetOn('tie')}
                    >
                      Tie
                    </button>
                  </div>
                </div>

                <div className="bet-control">
                  <h4>Bet Amount</h4>
                  <div className="bet-input-group">
                    <button 
                      className="bet-btn bet-minus"
                      onClick={() => {
                        const newBet = Math.max(5, bet - 5);
                        setBet(newBet);
                      }}
                      disabled={bet <= 5}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="baccarat-bet"
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
                    />
                    <button 
                      className="bet-btn bet-plus"
                      onClick={() => {
                        const newBet = Math.min(Math.min(balance, 100), bet + 5);
                        setBet(newBet);
                      }}
                      disabled={bet >= Math.min(balance, 100)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-primary btn-deal" 
                  onClick={handlePlay} 
                  disabled={loading || dealing || bet > balance}
                >
                  {loading || dealing ? 'Dealing...' : 'Play'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BaccaratGame;

