import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './QuickWinGame.css';

function QuickWinGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showWarning, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('quickwin', {
    bet: 10,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [spinning, setSpinning] = useState(false);
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
    if (bet > 100) {
      showWarning('Maximum bet is $100. Your bet has been adjusted.');
      setBet(100);
      return;
    }
    if (loading || balance < bet) return;

    setLoading(true);
    setSpinning(true);
    setResult(null);

    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/quickwin/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult({
        won: response.data.won,
        win: response.data.win,
        bet: response.data.bet,
        multiplier: response.data.multiplier
      });
      setShowResultOverlay(true);
      setBalance(response.data.balance);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quickwin-game-container">
      <GameHeader 
        title="⚡ Quick Win"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="quickwin-main">
        <div className="quickwin-game-layout">
          <div className="quickwin-board">
            <div className="game-area">
              <div className="quick-table">
                <div className="quick-display">
                  {spinning ? (
                    <div className="spinning-animation">
                      <div className="spin-wheel">
                        <div className="spin-segment">1x</div>
                        <div className="spin-segment">2x</div>
                        <div className="spin-segment">3x</div>
                        <div className="spin-segment">5x</div>
                      </div>
                      <div className="spin-text">Spinning...</div>
                    </div>
                  ) : result ? (
                    <div className={`result-icon-large ${result.won ? 'win' : 'lose'}`}>
                      {result.won ? (
                        <>
                          <div className="win-icon-large">🎊</div>
                          <div className="win-text">QUICK WIN!</div>
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
                    <div className="quick-placeholder">
                      <div className="placeholder-icon">⚡</div>
                      <div className="placeholder-text">Quick Win!</div>
                      <div className="placeholder-subtext">Fast results, instant fun!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="quickwin-controls">
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
                    {loading ? 'Spinning...' : '⚡ Quick Play'}
                  </button>
                </div>
              </div>

              <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Quick spins, instant results! Win multipliers: 1x, 2x, 3x, or 5x your bet.</p>
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
                      <li>Click "Quick Play" to spin</li>
                      <li>Win multipliers: 1x, 2x, 3x, or 5x</li>
                      <li>45% chance to win on each spin</li>
                      <li>Results are instant - no waiting!</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>1x Multiplier:</strong> Win 1x your bet</li>
                      <li><strong>2x Multiplier:</strong> Win 2x your bet</li>
                      <li><strong>3x Multiplier:</strong> Win 3x your bet</li>
                      <li><strong>5x Multiplier:</strong> Win 5x your bet</li>
                      <li>Win chance: 45%</li>
                      <li>House edge: 55%</li>
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

export default QuickWinGame;
