import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './ScratchGame.css';

function ScratchGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showWarning, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('scratch', { bet: 10 });
  const [bet, setBet] = useState(settings.bet);
  const [card, setCard] = useState([]);
  const [scratched, setScratched] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [scratchingIndex, setScratchingIndex] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet changes
  useEffect(() => {
    updateSettings({ bet });
  }, [bet, updateSettings]);

  const handleBuyCard = async () => {
    if (bet > 100) {
      showWarning('Maximum bet is $100. Your bet has been adjusted.');
      setBet(100);
      return;
    }
    if (user.balance < bet) {
      showInsufficientBalance(bet, user.balance);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/games/scratch/play`, { bet });
      setCard(response.data.card);
      setScratched([]);
      setGameActive(true);
      setResult(null);
      await fetchUser();
    } catch (error) {
      showError(error.response?.data?.message || 'Error buying scratch card. Please try again.');
    }
  };

  const handleScratch = (index) => {
    if (!gameActive || scratched.includes(index)) return;
    
    // Add scratching animation
    setScratchingIndex(index);
    
    // Simulate scratch delay
    setTimeout(() => {
      setScratched([...scratched, index]);
      setScratchingIndex(null);
      
      // Check for wins when all are scratched
      if (scratched.length + 1 === 9) {
        setTimeout(() => {
          checkWin();
        }, 300);
      }
    }, 200);
  };

  const handleAutoScratch = () => {
    if (!gameActive || scratched.length === 9) return;
    
    // Reveal all cells with animation delay
    const remainingIndices = [];
    for (let i = 0; i < 9; i++) {
      if (!scratched.includes(i)) {
        remainingIndices.push(i);
      }
    }
    
    // Reveal cells one by one with delay
    remainingIndices.forEach((index, idx) => {
      setTimeout(() => {
        setScratchingIndex(index);
        setTimeout(() => {
          const newScratched = [...scratched];
          for (let i = 0; i <= idx; i++) {
            if (!newScratched.includes(remainingIndices[i])) {
              newScratched.push(remainingIndices[i]);
            }
          }
          setScratched(newScratched);
          
          if (idx === remainingIndices.length - 1) {
            setScratchingIndex(null);
            setTimeout(() => {
              checkWin();
            }, 300);
          }
        }, 150);
      }, idx * 100);
    });
  };

  const checkWin = async () => {
    setGameActive(false);
    
    // Count matches
    const counts = {};
    card.forEach(symbol => {
      counts[symbol] = (counts[symbol] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts));
    let win = 0;
    let matchType = '';

    if (maxCount >= 3) {
      // Three of a kind or more
      const threeMatchSymbols = Object.keys(counts).filter(s => counts[s] >= 3);
      if (threeMatchSymbols.length > 0) {
        win = bet * 10;
        matchType = 'Three of a Kind!';
      }
    } else if (maxCount === 2) {
      // Two of a kind
      win = bet * 2;
      matchType = 'Two of a Kind!';
    }

    // Check for special symbols
    const specialCount = card.filter(s => s === '💎' || s === '7️⃣').length;
    if (specialCount >= 3 && win < bet * 50) {
      win = bet * 50;
      matchType = 'Special Bonus!';
    }

    const gameResult = { win, bet, matchType, won: win > 0 };
    setResult(gameResult);
    
    // Show confetti for big wins (50x multiplier or more)
    if (win >= bet * 50) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    }
    
    setShowResultOverlay(true);
    
    // Update balance
    await fetchUser();
  };

  const handleCloseResult = () => {
    setResult(null);
    setShowResultOverlay(false);
  };

  const handleNewCard = () => {
    setCard([]);
    setScratched([]);
    setGameActive(false);
    setResult(null);
    setShowResultOverlay(false);
    setResultClosing(false);
    fetchUser();
  };

  const handleRebet = async () => {
    // Close overlay first
    handleCloseResult();
    // Small delay to allow animation
    setTimeout(async () => {
      await handleBuyCard();
    }, 350);
  };

  return (
    <div className="scratch-game-container">
      <GameHeader 
        title="🎫 Scratch Cards"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="scratch-game">
        {card.length === 0 ? (
          <div className="scratch-start">
            <div className="bet-control">
              <BetControls
                bet={bet}
                setBet={setBet}
                balance={user?.balance || 0}
                minBet={5}
                maxBet={100}
                step={5}
                disabled={gameActive}
                quickBetOptions={[5, 10, 25, 50, 100]}
              />
            </div>
            <div className="game-buttons-container">
              <button onClick={handleBuyCard} className="btn btn-primary">
                Buy Scratch Card
              </button>
            </div>
          </div>
        ) : (
          <div className="scratch-game-layout">
            <div className="scratch-board">
              <div className="scratch-card">
                <div className="card-grid">
                  {card.map((symbol, index) => (
                    <div
                      key={index}
                      className={`card-cell ${scratched.includes(index) ? 'scratched' : ''} ${scratchingIndex === index ? 'scratching' : ''}`}
                      onClick={() => handleScratch(index)}
                    >
                      {scratched.includes(index) ? (
                        <span className="revealed-symbol">{symbol}</span>
                      ) : scratchingIndex === index ? (
                        <span className="scratch-effect">✨</span>
                      ) : (
                        <span className="gift-icon">🎁</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="scratch-controls">
              <div className="controls-row">
                <div className="betting-section">
                  <h3>Game Info</h3>
                  
                  <div className="scratch-info">
                    <p>Click on the boxes to scratch them!</p>
                    <p>Scratched: {scratched.length}/9</p>
                    {gameActive && scratched.length < 9 && (
                      <button
                        type="button"
                        onClick={handleAutoScratch}
                        className="btn-auto-scratch"
                        disabled={scratchingIndex !== null}
                      >
                        ⚡ Auto-Scratch All
                      </button>
                    )}
                  </div>

                  {!gameActive && result && !showResultOverlay && (
                    <div className="game-complete-actions">
                      <button type="button" onClick={handleNewCard} className="btn btn-secondary">
                        New Card
                      </button>
                      <button type="button" onClick={handleRebet} className="btn btn-primary">
                        Rebet (${bet})
                      </button>
                    </div>
                  )}
                </div>

                <div className="rules-section">
                  <h3>Game Rules</h3>
                  <div className="rules-content">
                    <div className="rules-objective">
                      <p><strong>Objective:</strong> Scratch all 9 boxes to reveal symbols. Match 3 of the same symbol to win!</p>
                    </div>
                    
                    <div className="rules-tabs">
                      <div className="tab-panel">
                        <ul>
                          <li>Buy a scratch card with your bet</li>
                          <li>Click boxes to scratch them</li>
                          <li>Match 3 of the same symbol to win</li>
                          <li>Use auto-scratch to reveal all at once</li>
                          <li>Winnings depend on matched symbols</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'][Math.floor(Math.random() * 8)]
              }}
            />
          ))}
        </div>
      )}

      <ResultOverlay
        result={result ? {
          win: result.won,
          won: result.won,
          message: result.won 
            ? `${result.matchType || 'You won!'}` 
            : 'Better luck next time!',
          amount: result.won ? result.win : -result.bet
        } : null}
        show={showResultOverlay}
        onClose={handleCloseResult}
        autoCloseDelay={5}
        showTimer={true}
      />
    </div>
  );
}

export default ScratchGame;

