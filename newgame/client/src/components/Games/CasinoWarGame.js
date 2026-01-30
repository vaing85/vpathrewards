import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './CasinoWarGame.css';

function CasinoWarGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('casinowar', {
    bet: 10,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab); // 'howtoplay', 'rankings', or 'payouts'
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [cards, setCards] = useState({ playerCard: null, dealerCard: null });
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

  const handlePlay = async () => {
    if (bet > balance) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setDealing(true);
    setLoading(true);
    setAnimatingCards([]);
    setCards({ playerCard: null, dealerCard: null });
    setResult(null);
    setShowResultPopup(false);
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/casinowar/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate dealing player card first
      setTimeout(() => {
        setCards({ playerCard: response.data.playerCard, dealerCard: null });
        setAnimatingCards(['player']);
      }, 300);

      // Animate dealing dealer card second
      setTimeout(() => {
        setCards({ playerCard: response.data.playerCard, dealerCard: response.data.dealerCard });
        setAnimatingCards(['player', 'dealer']);
      }, 600);

      // Show result after cards are dealt
      setTimeout(() => {
        setResult(response.data);
        setBalance(response.data.balance);
        setDealing(false);
        setAnimatingCards([]);
        setShowResultPopup(true);
        fetchUser();
      }, 1200);
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

  const getSuitColor = (suit) => {
    return suit === '♥' || suit === '♦' ? 'red' : 'black';
  };

  const getCardDisplay = (card) => {
    if (!card) return null;
    return {
      rank: card.rank,
      suit: card.suit,
      color: getSuitColor(card.suit)
    };
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
        <h1>🃏 Casino War</h1>
        <div className="balance-display">Balance: ${balance.toFixed(2)}</div>
      </div>

      <div className="war-table">
        <div className="table-layout">
          <div className="game-column">
            <div className="table-felt">
              <div className="game-area">
                {(result || cards.playerCard || cards.dealerCard) ? (
                  <div className="cards-display">
                    <div className="player-cards">
                      <h3>Your Card</h3>
                      {cards.playerCard ? (() => {
                        const display = getCardDisplay(cards.playerCard);
                        const isAnimating = animatingCards.includes('player');
                        return (
                          <div className={`card ${isAnimating ? 'dealing' : ''} ${display.color}`}>
                            <div className="card-inner">
                              <div className="card-corner card-top">
                                <div className="card-rank">{display.rank}</div>
                                <div className="card-suit">{display.suit}</div>
                              </div>
                              <div className="card-center">
                                <div className={`card-suit-large ${display.color}`}>{display.suit}</div>
                              </div>
                              <div className="card-corner card-bottom">
                                <div className="card-rank">{display.rank}</div>
                                <div className="card-suit">{display.suit}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })() : null}
                    </div>
                    <div className="dealer-cards">
                      <h3>Dealer Card</h3>
                      {cards.dealerCard ? (() => {
                        const display = getCardDisplay(cards.dealerCard);
                        const isAnimating = animatingCards.includes('dealer');
                        return (
                          <div className={`card ${isAnimating ? 'dealing' : ''} ${display.color}`}>
                            <div className="card-inner">
                              <div className="card-corner card-top">
                                <div className="card-rank">{display.rank}</div>
                                <div className="card-suit">{display.suit}</div>
                              </div>
                              <div className="card-center">
                                <div className={`card-suit-large ${display.color}`}>{display.suit}</div>
                              </div>
                              <div className="card-corner card-bottom">
                                <div className="card-rank">{display.rank}</div>
                                <div className="card-suit">{display.suit}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })() : null}
                    </div>
                  </div>
                ) : (
                  <div className="game-placeholder">
                    <p>Place your bet and click Play War</p>
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
                ? 'You won!'
                : 'Better luck next time!',
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
                    <p><strong>Objective:</strong> Get a higher card than the dealer.</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <button 
                      className={`rules-tab ${rulesTab === 'howtoplay' ? 'active' : ''}`}
                      onClick={() => setRulesTab('howtoplay')}
                      type="button"
                    >
                      How to Play
                    </button>
                    <button 
                      className={`rules-tab ${rulesTab === 'rankings' ? 'active' : ''}`}
                      onClick={() => setRulesTab('rankings')}
                      type="button"
                    >
                      Rankings
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
                    {rulesTab === 'howtoplay' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Place your bet</li>
                          <li>You and dealer each get one card</li>
                          <li>Higher card wins</li>
                          <li>If tied, it's war!</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'rankings' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Ace: Highest</li>
                          <li>King, Queen, Jack: 11, 12, 13</li>
                          <li>2-10: Face value</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'payouts' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Win: 1:1</li>
                          <li>War (tie): Push (bet returned)</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="betting-controls">
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
                      id="casinowar-bet"
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
                  {loading || dealing ? 'Dealing...' : 'Play War'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CasinoWarGame;

