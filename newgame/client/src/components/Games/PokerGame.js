import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './PokerGame.css';

function PokerGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('poker', {
    bet: 10,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [hand, setHand] = useState([]);
  const [heldCards, setHeldCards] = useState([]);
  const [gameState, setGameState] = useState('idle'); // idle, playing, finished
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab); // 'howtoplay' or 'rankings'
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, rulesTab });
  }, [bet, rulesTab, updateSettings]);

  const getCardValue = (card) => {
    if (typeof card === 'string') return 0;
    if (card.rank === 'A') return 14;
    if (card.rank === 'K') return 13;
    if (card.rank === 'Q') return 12;
    if (card.rank === 'J') return 11;
    return parseInt(card.rank);
  };

  const evaluateHand = (cards) => {
    const values = cards.map(c => getCardValue(c)).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] - 1);
    const pairs = Object.values(counts).filter(c => c === 2).length;
    const threeOfAKind = Object.values(counts).some(c => c === 3);
    const fourOfAKind = Object.values(counts).some(c => c === 4);

    if (isFlush && isStraight && values[0] === 14) return { name: 'Royal Flush', multiplier: 250 };
    if (isFlush && isStraight) return { name: 'Straight Flush', multiplier: 50 };
    if (fourOfAKind) return { name: 'Four of a Kind', multiplier: 25 };
    if (threeOfAKind && pairs > 0) return { name: 'Full House', multiplier: 9 };
    if (isFlush) return { name: 'Flush', multiplier: 6 };
    if (isStraight) return { name: 'Straight', multiplier: 4 };
    if (threeOfAKind) return { name: 'Three of a Kind', multiplier: 3 };
    if (pairs === 2) return { name: 'Two Pair', multiplier: 2 };
    if (pairs === 1) return { name: 'Pair', multiplier: 1 };
    return { name: 'High Card', multiplier: 0 };
  };

  const handleDeal = async () => {
    if (user.balance < bet) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setDealing(true);
    setAnimatingCards([]);
    setHand([]);
    setHeldCards([]);
    setResult(null);
    setShowResultPopup(false);
    setResultClosing(false);
    setNotificationTimer(5);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const response = await axios.post(`${API_URL}/games/poker/play`, {
        bet,
        action: 'deal'
      });
      
      // Animate dealing cards sequentially
      const newHand = [];
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          newHand.push(response.data.hand[i]);
          setHand([...newHand]);
          setAnimatingCards(prev => [...prev, i]);
        }, i * 200);
      }

      // Set game state after all cards are dealt
      setTimeout(() => {
        setGameState('playing');
        setDealing(false);
        setAnimatingCards([]);
        fetchUser();
      }, 5 * 200 + 300);
    } catch (error) {
      showError(error.response?.data?.message || 'Error dealing cards. Please try again.');
      setDealing(false);
      setAnimatingCards([]);
    }
  };

  const handleHold = (index) => {
    if (gameState !== 'playing') return;
    if (heldCards.includes(index)) {
      setHeldCards(heldCards.filter(i => i !== index));
    } else {
      setHeldCards([...heldCards, index]);
    }
  };

  const handleDraw = async () => {
    try {
      const response = await axios.post(`${API_URL}/games/poker/play`, {
        bet,
        action: 'draw',
        hand,
        heldIndices: heldCards
      });

      setHand(response.data.hand);
      setGameState('finished');
      setResult({
        handName: response.data.handName,
        multiplier: response.data.multiplier,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.win > 0
      });
      setShowResultPopup(true);
      await fetchUser();
    } catch (error) {
      showError(error.response?.data?.message || 'Error drawing cards. Please try again.');
    }
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  return (
    <div className="game-container">
      <GameHeader 
        title="🃏 Video Poker"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="poker-table">
        <div className="table-layout">
          <div className="game-column">
            <div className="table-felt">
              <div className="poker-hand">
                {hand.length > 0 ? (
                  hand.map((card, index) => {
                    const isAnimating = animatingCards.includes(index);
                    return (
                      <div
                        key={index}
                        className={`poker-card ${isAnimating ? 'dealing' : ''} ${heldCards.includes(index) ? 'held' : ''} ${gameState === 'playing' ? 'clickable' : ''}`}
                        onClick={() => handleHold(index)}
                      >
                        {card.rank}{card.suit}
                        {heldCards.includes(index) && <div className="hold-badge">HELD</div>}
                      </div>
                    );
                  })
                ) : (
                  <div className="poker-placeholder">Click "Deal Cards" to start</div>
                )}
              </div>

              <div className="game-controls">
                {gameState === 'playing' && (
                  <button onClick={handleDraw} className="btn btn-success">
                    Draw Cards
                  </button>
                )}

                {gameState === 'finished' && (
                  <button
                    onClick={() => {
                      setGameState('idle');
                      setHand([]);
                      setHeldCards([]);
                      setResult(null);
                      setShowResultPopup(false);
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

          <ResultOverlay
            result={result ? {
              win: result.won,
              won: result.won,
              message: result.won 
                ? `${result.handName}! You won ${result.win} (${result.bet} × ${result.multiplier})`
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
                    <p><strong>Objective:</strong> Make the best 5-card poker hand.</p>
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
                      Hand Rankings
                    </button>
                  </div>

                  <div className="rules-tab-content">
                    {rulesTab === 'howtoplay' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Deal 5 cards</li>
                          <li>Hold cards you want to keep</li>
                          <li>Draw new cards to replace the rest</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'rankings' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Royal Flush: 250x</li>
                          <li>Straight Flush: 50x</li>
                          <li>Four of a Kind: 25x</li>
                          <li>Full House: 9x</li>
                          <li>Flush: 6x</li>
                          <li>Straight: 4x</li>
                          <li>Three of a Kind: 3x</li>
                          <li>Two Pair: 2x</li>
                          <li>Pair: 1x</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="betting-controls">
                {gameState === 'idle' && (
                  <>
                    <div className="bet-control">
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
                          id="poker-bet"
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
                        />
                        <button 
                          className="bet-btn bet-plus"
                          onClick={() => {
                            const maxBet = Math.min(user?.balance || 0, 100);
                            const newBet = Math.min(maxBet, bet + 5);
                            setBet(newBet);
                          }}
                          disabled={bet >= Math.min(user?.balance || 0, 100)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button onClick={handleDeal} className="btn btn-primary btn-deal" disabled={dealing}>
                      {dealing ? 'Dealing...' : 'Deal Cards'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PokerGame;

