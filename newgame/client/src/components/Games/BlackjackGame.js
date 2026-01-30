import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './BlackjackGame.css';

function BlackjackGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('blackjack', {
    bet: 10,
    rulesTab: 'cardvalues'
  });
  const [bet, setBet] = useState(settings.bet);
  const [gameState, setGameState] = useState('idle'); // idle, playing, finished
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [dealerHidden, setDealerHidden] = useState(true);
  const [result, setResult] = useState(null);
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [flippingCard, setFlippingCard] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab); // 'cardvalues', 'actions', or 'winning'
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, rulesTab });
  }, [bet, rulesTab, updateSettings]);

  const getCardValue = (card) => {
    if (typeof card === 'string' || !card) return 0; // Hidden card
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
  };

  const getSuitColor = (suit) => {
    return suit === '♥' || suit === '♦' ? 'red' : 'black';
  };

  const getCardDisplay = (card, isHidden = false) => {
    if (isHidden || typeof card === 'string' || !card) {
      return { rank: '?', suit: '?', color: 'black' };
    }
    return {
      rank: card.rank,
      suit: card.suit,
      color: getSuitColor(card.suit)
    };
  };

  const calculateHandValue = (hand) => {
    let value = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (typeof card === 'string') return;
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += getCardValue(card);
      }
    });

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  };

  const handleDeal = async () => {
    if (user.balance < bet) {
      showInsufficientBalance(bet, user.balance);
      return;
    }

    setDealing(true);
    setAnimatingCards([]);

    try {
      const response = await axios.post(`${API_URL}/games/blackjack/play`, {
        bet,
        action: 'deal'
      });
      
      // Animate card dealing
      const newPlayerHand = [];
      const newDealerHand = [];
      
      // Deal player cards with animation
      for (let i = 0; i < response.data.playerHand.length; i++) {
        setTimeout(() => {
          newPlayerHand.push(response.data.playerHand[i]);
          setPlayerHand([...newPlayerHand]);
          setAnimatingCards(prev => [...prev, `player-${i}`]);
        }, i * 300);
      }

      // Deal dealer cards with animation
      for (let i = 0; i < response.data.dealerHand.length; i++) {
        setTimeout(() => {
          newDealerHand.push(response.data.dealerHand[i]);
          setDealerHand([...newDealerHand]);
          setAnimatingCards(prev => [...prev, `dealer-${i}`]);
        }, (response.data.playerHand.length * 300) + (i * 300));
      }

      setTimeout(() => {
        setGameState('playing');
        setDealerHidden(true);
        setResult(null);
        setShowResultPopup(false);
        setResultClosing(false);
        setNotificationTimer(5);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setDealing(false);
        fetchUser();
      }, (response.data.playerHand.length + response.data.dealerHand.length) * 300);
    } catch (error) {
      showError(error.response?.data?.message || 'Error dealing cards. Please try again.');
      setDealing(false);
    }
  };

  const handleHit = async () => {
    setDealing(true);
    
    // Generate a new card
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newCard = {
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)]
    };

    setTimeout(() => {
      const newHand = [...playerHand, newCard];
      setPlayerHand(newHand);
      setAnimatingCards(prev => [...prev, `player-${newHand.length - 1}`]);
      setDealing(false);

      const playerValue = calculateHandValue(newHand);
      if (playerValue > 21) {
        setTimeout(() => {
          setGameState('finished');
          setDealerHidden(false);
          const dealerVal = calculateHandValue(dealerHand);
          setResult({ win: false, message: 'Bust! You went over 21.', amount: 0 });
        }, 500);
      }
    }, 300);
  };

  const handleStand = async () => {
    setDealing(true);

    // Reveal dealer's hidden card first with flip animation
    setTimeout(() => {
      setFlippingCard(true);
      setTimeout(() => {
        setDealerHidden(false);
        setTimeout(() => {
          setFlippingCard(false);
        }, 600);
      }, 100);
    }, 300);

    // After card flip, start dealer drawing
    setTimeout(() => {
      // Dealer draws until 17 or higher
      let dealerValue = calculateHandValue(dealerHand);
      const newDealerHand = [...dealerHand];
      let cardIndex = dealerHand.length;
      
      const drawDealerCard = () => {
        if (dealerValue >= 17) {
          setDealerHand(newDealerHand);
          setDealing(false);
          setGameState('finished');
          
          const playerValue = calculateHandValue(playerHand);
          handleGameEnd(playerValue, dealerValue, bet);
          return;
        }

        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const newCard = {
          suit: suits[Math.floor(Math.random() * suits.length)],
          rank: ranks[Math.floor(Math.random() * ranks.length)]
        };
        newDealerHand.push(newCard);
        dealerValue = calculateHandValue(newDealerHand);
        
        setDealerHand([...newDealerHand]);
        setAnimatingCards(prev => [...prev, `dealer-${cardIndex}`]);
        cardIndex++;

        setTimeout(drawDealerCard, 1000);
      };

      drawDealerCard();
    }, 1000);
  };

  const handleGameEnd = (playerValue, dealerValue, betAmount) => {
    let win = false;
    let amount = 0;
    let message = '';

    if (dealerValue > 21) {
      win = true;
      amount = betAmount * 2;
      message = 'Dealer busts! You win!';
    } else if (playerValue > dealerValue) {
      win = true;
      amount = betAmount * 2;
      message = 'You win!';
    } else if (playerValue < dealerValue) {
      win = false;
      amount = 0;
      message = 'Dealer wins!';
    } else {
      win = null;
      amount = betAmount;
      message = 'Push! It\'s a tie.';
    }

    setResult({ win, message, amount });
    setShowResultPopup(true);
    
    // Update balance on server if there's a win
    if (amount > 0 && win !== false) {
      fetchUser();
    }
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);

  return (
    <div className="game-container">
      <GameHeader 
        title="🃏 Blackjack"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="blackjack-table">
        <div className="table-layout">
          <div className="game-column">
            <div className="table-felt">
              <div className="dealer-section">
                <div className="section-label">
                  <h2>Dealer</h2>
                  {!dealerHidden && <div className="hand-value">Value: {dealerValue}</div>}
                </div>
                <div className="dealer-area">
                  <div className="dealer-hand-animation">
                    <div className="dealer-hand">
                      {dealerHand.map((card, index) => {
                        const isHidden = dealerHidden && index === 1;
                        const cardDisplay = getCardDisplay(card, isHidden);
                        const isAnimating = animatingCards.includes(`dealer-${index}`);
                        const isFlipping = flippingCard && index === 1 && isHidden;
                        return (
                          <div 
                            key={index} 
                            className={`card ${isAnimating ? 'dealing' : ''} ${isHidden ? 'hidden' : ''} ${isFlipping ? 'flip-reveal' : ''} ${cardDisplay.color}`}
                          >
                            <div className="card-inner">
                              <div className="card-corner top-left">
                                <div className="card-rank">{cardDisplay.rank}</div>
                                <div className="card-suit">{cardDisplay.suit}</div>
                              </div>
                              <div className="card-center">
                                <div className="card-suit-large">{cardDisplay.suit}</div>
                              </div>
                              <div className="card-corner bottom-right">
                                <div className="card-rank">{cardDisplay.rank}</div>
                                <div className="card-suit">{cardDisplay.suit}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {dealing && dealerHand.length > 0 && (
                      <div className="dealer-arm">
                        <div className="dealer-hand-icon">👋</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="player-section">
                <div className="section-label">
                  <h2>Player</h2>
                  {playerHand.length > 0 && (
                    <div className={`hand-value ${playerValue > 21 ? 'bust' : ''}`}>
                      Value: {playerValue}
                    </div>
                  )}
                </div>
                <div className="hand">
                  {playerHand.map((card, index) => {
                    const cardDisplay = getCardDisplay(card);
                    const isAnimating = animatingCards.includes(`player-${index}`);
                    return (
                      <div 
                        key={index} 
                        className={`card ${isAnimating ? 'dealing' : ''} ${cardDisplay.color}`}
                      >
                        <div className="card-inner">
                          <div className="card-corner top-left">
                            <div className="card-rank">{cardDisplay.rank}</div>
                            <div className="card-suit">{cardDisplay.suit}</div>
                          </div>
                          <div className="card-center">
                            <div className="card-suit-large">{cardDisplay.suit}</div>
                          </div>
                          <div className="card-corner bottom-right">
                            <div className="card-rank">{cardDisplay.rank}</div>
                            <div className="card-suit">{cardDisplay.suit}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          <ResultOverlay
            result={result ? {
              win: result.win === true ? true : result.win === false ? false : null,
              won: result.win === true,
              message: result.message || (result.win === true ? 'You won!' : result.win === false ? 'You lost!' : 'It\'s a tie!'),
              amount: result.amount || (result.win === true ? bet * 2 : result.win === false ? -bet : 0)
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
                    <p><strong>Objective:</strong> Get closer to 21 than the dealer without going over.</p>
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
                      className={`rules-tab ${rulesTab === 'actions' ? 'active' : ''}`}
                      onClick={() => setRulesTab('actions')}
                      type="button"
                    >
                      Actions
                    </button>
                    <button 
                      className={`rules-tab ${rulesTab === 'winning' ? 'active' : ''}`}
                      onClick={() => setRulesTab('winning')}
                      type="button"
                    >
                      Winning
                    </button>
                  </div>

                  <div className="rules-tab-content">
                    {rulesTab === 'cardvalues' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Number cards: Face value</li>
                          <li>Face cards (J, Q, K): 10</li>
                          <li>Ace: 11 or 1 (your choice)</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'actions' && (
                      <div className="tab-panel">
                        <ul>
                          <li><strong>Hit:</strong> Take another card</li>
                          <li><strong>Stand:</strong> Keep your current hand</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'winning' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Beat dealer's hand without busting</li>
                          <li>Dealer must hit until reaching 17</li>
                          <li>Blackjack (21) pays 2:1</li>
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
                          id="blackjack-bet"
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
                    <button 
                      onClick={handleDeal} 
                      className="btn btn-primary btn-deal"
                      disabled={dealing}
                    >
                      {dealing ? 'Dealing...' : 'Deal Cards'}
                    </button>
                  </>
                )}

                {gameState === 'playing' && (
                  <div className="game-controls">
                    <button 
                      onClick={handleHit} 
                      className="btn btn-success btn-hit"
                      disabled={dealing}
                    >
                      Hit
                    </button>
                    <button 
                      onClick={handleStand} 
                      className="btn btn-danger btn-stand"
                      disabled={dealing}
                    >
                      Stand
                    </button>
                  </div>
                )}

                {gameState === 'finished' && (
                  <button
                    onClick={() => {
                      setGameState('idle');
                      setPlayerHand([]);
                      setDealerHand([]);
                      setResult(null);
                      setShowResultPopup(false);
                      setResultClosing(false);
                      setNotificationTimer(5);
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                      }
                      setAnimatingCards([]);
                      fetchUser();
                    }}
                    className="btn btn-primary btn-new-game"
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

export default BlackjackGame;

