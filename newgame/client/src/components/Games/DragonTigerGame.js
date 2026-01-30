import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './DragonTigerGame.css';

function DragonTigerGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('dragontiger', {
    bet: 5,
    betOn: 'dragon'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betOn, setBetOn] = useState(settings.betOn);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [cards, setCards] = useState({ dragonCard: null, tigerCard: null });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, betOn });
  }, [bet, betOn, updateSettings]);

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

  const handleNewGame = () => {
    setResult(null);
    setDealing(false);
    setCards({ dragonCard: null, tigerCard: null });
    setAnimatingCards([]);
    setResultClosing(false);
    setShowResultPopup(false);
    setNotificationTimer(5);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const handlePlay = async () => {
    if (bet > balance) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setDealing(true);
    setLoading(true);
    setAnimatingCards([]);
    setCards({ dragonCard: null, tigerCard: null });
    setResult(null);
    setShowResultPopup(false);
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/dragontiger/play`,
        { bet, betOn },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate dealing dragon card first
      setTimeout(() => {
        setCards({ dragonCard: response.data.dragonCard, tigerCard: null });
        setAnimatingCards(['dragon']);
      }, 300);

      // Animate dealing tiger card second
      setTimeout(() => {
        setCards({ dragonCard: response.data.dragonCard, tigerCard: response.data.tigerCard });
        setAnimatingCards(['dragon', 'tiger']);
      }, 600);

      // Show result after cards are dealt
      setTimeout(() => {
        setResult({
          dragonCard: response.data.dragonCard,
          tigerCard: response.data.tigerCard,
          win: response.data.win,
          bet: response.data.bet,
          won: response.data.win > 0
        });
        setShowResultPopup(true);
        setBalance(response.data.balance);
        setDealing(false);
        setAnimatingCards([]);
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


  return (
    <div className="dragontiger-game-container">
      <GameHeader 
        title="🐉🐅 Dragon Tiger"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="dragontiger-game">
        <div className="dragontiger-game-layout">
          <div className="dragontiger-board">
            <div className="cards-display">
              <div className="dragon-cards">
                <h3>🐉 Dragon</h3>
                {cards.dragonCard ? (() => {
                  const display = getCardDisplay(cards.dragonCard);
                  const isAnimating = animatingCards.includes('dragon');
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
                })() : (
                  <div className="card-placeholder">?</div>
                )}
              </div>
              <div className="tiger-cards">
                <h3>🐅 Tiger</h3>
                {cards.tigerCard ? (() => {
                  const display = getCardDisplay(cards.tigerCard);
                  const isAnimating = animatingCards.includes('tiger');
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
                })() : (
                  <div className="card-placeholder">?</div>
                )}
              </div>
            </div>
          </div>

          <div className="dragontiger-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-type-section">
                  <label>Bet On</label>
                  <div className="bet-type-buttons">
                    <button 
                      className={`bet-type-btn ${betOn === 'dragon' ? 'active' : ''}`}
                      onClick={() => setBetOn('dragon')}
                      disabled={dealing}
                    >
                      <div className="bet-type-header">
                        <span className="bet-type-name">🐉 Dragon</span>
                        <span className="bet-type-payout">2:1</span>
                      </div>
                    </button>
                    <button 
                      className={`bet-type-btn ${betOn === 'tiger' ? 'active' : ''}`}
                      onClick={() => setBetOn('tiger')}
                      disabled={dealing}
                    >
                      <div className="bet-type-header">
                        <span className="bet-type-name">🐅 Tiger</span>
                        <span className="bet-type-payout">2:1</span>
                      </div>
                    </button>
                    <button 
                      className={`bet-type-btn ${betOn === 'tie' ? 'active' : ''}`}
                      onClick={() => setBetOn('tie')}
                      disabled={dealing}
                    >
                      <div className="bet-type-header">
                        <span className="bet-type-name">Tie</span>
                        <span className="bet-type-payout">8:1</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bet-options">
                  {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                      onClick={() => setBet(Math.min(amount, Math.min(balance, 100)))}
                      disabled={dealing || amount > balance}
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
                      disabled={bet <= 5 || dealing}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="dragontiger-bet"
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
                      disabled={dealing}
                    />
                    <button 
                      className="bet-adjust-btn plus"
                      onClick={() => {
                        const newBet = Math.min(Math.min(balance, 100), bet + 5);
                        setBet(newBet);
                      }}
                      disabled={bet >= Math.min(balance, 100) || dealing}
                    >
                      +
                    </button>
                  </div>
                </div>

                {!result ? (
                  <button
                    onClick={handlePlay}
                    disabled={dealing || balance < bet}
                    className="play-btn"
                  >
                    {dealing || loading ? 'Dealing...' : '🃏 Deal Cards'}
                  </button>
                ) : (
                  <div className="game-buttons-container">
                    <button
                      onClick={handlePlay}
                      disabled={dealing || balance < bet}
                      className="play-btn"
                    >
                      {dealing || loading ? 'Dealing...' : '🃏 Deal Cards'}
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
                    <p><strong>Objective:</strong> Bet on which card will be higher - Dragon or Tiger. Win by correctly predicting the outcome.</p>
                  </div>
                  
                  <div className="rules-tabs">
                    <div className="tab-panel">
                      <ul>
                        <li>Select Dragon, Tiger, or Tie</li>
                        <li>Set your bet amount (minimum $5)</li>
                        <li>Click "Deal Cards" to deal one card to each side</li>
                        <li><strong>Dragon:</strong> Win if Dragon card is higher (pays 2:1)</li>
                        <li><strong>Tiger:</strong> Win if Tiger card is higher (pays 2:1)</li>
                        <li><strong>Tie:</strong> Win if both cards have the same rank (pays 8:1)</li>
                        <li>Card ranking: A (lowest), 2-10, J, Q, K (highest)</li>
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
            ? 'You won!'
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

export default DragonTigerGame;
