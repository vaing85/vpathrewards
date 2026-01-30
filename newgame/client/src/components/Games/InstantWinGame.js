import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './InstantWinGame.css';

function InstantWinGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showWarning, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('instantwin', {
    bet: 10,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [revealing, setRevealing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
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

  const handleCloseResult = () => {
    setResult(null);
    setShowResultOverlay(false);
  };

  const handlePlay = async () => {
    if (loading || balance < bet || bet > 100) {
      if (bet > 100) {
        showWarning('Maximum bet is $100. Your bet has been adjusted.');
        setBet(100);
      }
      return;
    }

    setLoading(true);
    setRevealing(true);
    setResult(null);

    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/instantwin/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const gameResult = {
        won: response.data.won,
        win: response.data.win,
        bet: response.data.bet,
        multiplier: response.data.multiplier
      };
      setResult(gameResult);
      setBalance(response.data.balance);
      await fetchUser();
      setRevealing(false);
      
      // Show confetti for big wins (10x multiplier or more)
      if (gameResult.won && gameResult.multiplier >= 10) {
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      }
      
      setShowResultOverlay(true);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setRevealing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRebet = async () => {
    // Close overlay first
    handleCloseResult();
    // Small delay to allow animation
    setTimeout(async () => {
      await handlePlay();
    }, 350);
  };

  return (
    <div className="instantwin-game-container">
      <GameHeader 
        title="⚡ Instant Win"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="instantwin-main">
        <div className="instantwin-game-layout">
          <div className="instantwin-board">
            <div className="game-area">
              <div className="instant-table">
                <div className="instant-display">
                  {revealing ? (
                    <div className="revealing-animation">
                      <div className="sparkle">✨</div>
                      <div className="sparkle">⭐</div>
                      <div className="sparkle">💫</div>
                      <div className="reveal-text">Revealing...</div>
                    </div>
                  ) : result ? (
                    <div className={`result-icon-large ${result.won ? 'win' : 'lose'}`}>
                      {result.won ? (
                        <>
                          <div className="win-icon-large">🎉</div>
                          <div className="win-text">WINNER!</div>
                          <div className="win-amount-large">${result.win?.toFixed(2)}</div>
                          {result.multiplier && (
                            <div className="multiplier-badge">{result.multiplier}x</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="lose-icon-large">😔</div>
                          <div className="lose-text">Try Again</div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="instant-placeholder">
                      <div className="placeholder-icon">⚡</div>
                      <div className="placeholder-text">Ready to Win?</div>
                      <div className="placeholder-subtext">Place your bet and play!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="instantwin-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-amount-section">
                  <BetControls
                    bet={bet}
                    setBet={setBet}
                    balance={balance}
                    minBet={5}
                    maxBet={100}
                    step={5}
                    disabled={loading}
                    quickBetOptions={[5, 10, 25, 50, 100]}
                  />
                </div>

                <div className="game-buttons-container">
                  <button
                    type="button"
                    onClick={handlePlay}
                    disabled={loading || balance < bet}
                    className="play-btn"
                  >
                    {loading ? 'Playing...' : '⚡ Play Now'}
                  </button>
                </div>
              </div>

              <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Test your luck with instant results! Win multipliers based on chance.</p>
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
                      <li>Set your bet amount (minimum $5, maximum $100)</li>
                      <li>Click "Play Now" to reveal your result</li>
                      <li>Win multipliers: 2x, 5x, or 10x your bet</li>
                      <li>40% chance to win on each play</li>
                      <li>Results are instant - no waiting!</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>2x Multiplier:</strong> Win 2x your bet</li>
                      <li><strong>5x Multiplier:</strong> Win 5x your bet</li>
                      <li><strong>10x Multiplier:</strong> Win 10x your bet</li>
                      <li>Win chance: 40%</li>
                      <li>House edge: 60%</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
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
            ? `${result.multiplier ? result.multiplier + 'x Multiplier! ' : ''}You won!`
            : 'Better luck next time!',
          amount: result.won ? result.win : -result.bet
        } : null}
        show={showResultOverlay}
        onClose={handleCloseResult}
        autoCloseDelay={5}
        showTimer={true}
      />
      </div>
    </div>
  );
}

export default InstantWinGame;
