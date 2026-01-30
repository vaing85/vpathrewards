import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './RedDogGame.css';

function RedDogGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('reddog', {
    bet: 5,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [cards, setCards] = useState({ playerCard: null, dealerCard: null });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet or rulesTab changes
  useEffect(() => {
    updateSettings({ bet, rulesTab });
  }, [bet, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/reddog/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const suits = ['♠', '♥', '♦', '♣'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      
      const playerCard = {
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        suit: suits[Math.floor(Math.random() * suits.length)]
      };
      const dealerCard = {
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        suit: suits[Math.floor(Math.random() * suits.length)]
      };

      setTimeout(() => {
        setCards({ playerCard, dealerCard: null });
        setAnimatingCards(['player']);
      }, 300);

      setTimeout(() => {
        setCards({ playerCard, dealerCard });
        setAnimatingCards(['player', 'dealer']);
      }, 600);

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setResult(null);
    setShowResultPopup(false);
    setCards({ playerCard: null, dealerCard: null });
  };

  return (
    <div className="game-container">
      <GameHeader 
        title="🃏 Red Dog"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="reddog-table">
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
                    <p>Place your bet and click Play</p>
                  </div>
                )}
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

          <div className="betting-column">
            <div className="betting-area">
              <div className="game-rules">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> Compare your card with the dealer's card. Higher card wins.</p>
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
                          <li>You receive one card</li>
                          <li>Dealer receives one card</li>
                          <li>Higher card wins</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'payouts' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Win chance: 40%</li>
                          <li>Multipliers: 1x to 11x</li>
                          <li>Payout based on card comparison</li>
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
                      id="reddog-bet"
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
              </div>

              <div className="game-controls">
                {!result && !cards.playerCard && (
                  <button 
                    onClick={handlePlay} 
                    className="btn btn-primary"
                    disabled={loading || dealing}
                  >
                    {loading || dealing ? 'Dealing...' : 'Play'}
                  </button>
                )}
                {result && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setCards({ playerCard: null, dealerCard: null });
                      setAnimatingCards([]);
                      setDealing(false);
                      fetchUser();
                    }}
                    className="btn btn-primary"
                  >
                    New Game
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RedDogGame;
