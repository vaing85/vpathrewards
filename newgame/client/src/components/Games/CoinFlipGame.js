import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './CoinFlipGame.css';

function CoinFlipGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showWarning, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('coinflip', {
    bet: 10,
    betOn: 'heads',
    rulesTab: 'howtoplay'
  });
  
  const [bet, setBet] = useState(settings.bet);
  const [betOn, setBetOn] = useState(settings.betOn);
  const [flipping, setFlipping] = useState(false);
  const [coinSide, setCoinSide] = useState(null);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [balance, setBalance] = useState(user?.balance || 0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when bet, betOn, or rulesTab changes
  useEffect(() => {
    updateSettings({ bet, betOn, rulesTab });
  }, [bet, betOn, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const handleCloseResult = () => {
    setResult(null);
    setShowResultOverlay(false);
  };

  const handleFlip = async () => {
    if (bet > 100) {
      showWarning('Maximum bet is $100. Your bet has been adjusted.');
      setBet(100);
      return;
    }
    if (flipping || balance < bet) return;

    setFlipping(true);
    setResult(null);
    setCoinSide(null);

    // Animate coin flipping
    const flipDuration = 2000;
    const flipInterval = 50;
    let elapsed = 0;

    const flipAnimation = setInterval(() => {
      setCoinSide(Math.random() > 0.5 ? 'heads' : 'tails');
      elapsed += flipInterval;
      if (elapsed >= flipDuration) {
        clearInterval(flipAnimation);
        performFlip();
      }
    }, flipInterval);
  };

  const performFlip = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/coinflip/play`,
        { bet, betOn },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCoinSide(response.data.result);
      const resultData = {
        result: response.data.result,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.win > 0
      };
      setResult(resultData);
      setShowResultOverlay(true);
      setBalance(response.data.balance);
      await fetchUser();
      setFlipping(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error flipping coin. Please try again.');
      setFlipping(false);
    }
  };

  return (
    <div className="coinflip-game-container">
      <GameHeader 
        title="🪙 Coin Flip"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="coinflip-main">
        <div className="coinflip-game-layout">
          <div className="coinflip-board">
            <div className="game-area">
              <div className="coin-table">
                <div className="coin-display">
                  <div className={`coin-wrapper ${flipping ? 'flipping' : ''}`}>
                    <div className={`coin ${coinSide === 'heads' ? 'heads' : coinSide === 'tails' ? 'tails' : ''}`}>
                      {coinSide === 'heads' ? (
                        <div className="coin-face heads-face">
                          <span className="coin-icon">🪙</span>
                          <span className="coin-label">HEADS</span>
                        </div>
                      ) : coinSide === 'tails' ? (
                        <div className="coin-face tails-face">
                          <span className="coin-icon">🪙</span>
                          <span className="coin-label">TAILS</span>
                        </div>
                      ) : (
                        <div className="coin-placeholder">?</div>
                      )}
                    </div>
                  </div>
                </div>
                {result && (
                  <div className="result-display">
                    <div className={`outcome ${result.won ? 'win' : 'lose'}`}>
                      {result.won ? '🎉 Winner!' : '😔 Try Again'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="coinflip-controls">
            <div className="controls-row">
              <div className="betting-section">
                <h3>Place Your Bet</h3>
                
                <div className="bet-type-section">
                  <label>Bet On</label>
                  <div className="bet-type-buttons">
                    <button
                      type="button"
                      className={`bet-type-btn ${betOn === 'heads' ? 'active' : ''}`}
                      onClick={() => setBetOn('heads')}
                      disabled={flipping}
                    >
                      <span className="bet-type-icon">🪙</span>
                      <span className="bet-type-name">Heads</span>
                    </button>
                    <button
                      type="button"
                      className={`bet-type-btn ${betOn === 'tails' ? 'active' : ''}`}
                      onClick={() => setBetOn('tails')}
                      disabled={flipping}
                    >
                      <span className="bet-type-icon">🪙</span>
                      <span className="bet-type-name">Tails</span>
                    </button>
                  </div>
                </div>

                <div className="bet-amount-section">
                  <BetControls
                    bet={bet}
                    setBet={setBet}
                    balance={balance}
                    minBet={5}
                    maxBet={100}
                    step={5}
                    disabled={flipping}
                    quickBetOptions={[5, 10, 25, 50, 100]}
                  />
                </div>

                <div className="game-buttons-container">
                  <button
                    type="button"
                    onClick={handleFlip}
                    disabled={flipping || balance < bet}
                    className="flip-btn"
                  >
                    {flipping ? 'Flipping...' : '🪙 Flip Coin'}
                  </button>
                </div>
              </div>

              <div className="rules-section">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> Predict whether the coin will land on heads or tails. Win double your bet if you guess correctly.</p>
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
                          <li>Choose whether to bet on Heads or Tails</li>
                          <li>Set your bet amount (minimum $5, maximum $100)</li>
                          <li>Click "Flip Coin" to flip the coin</li>
                          <li>If your prediction is correct, you win 2x your bet</li>
                          <li>If incorrect, you lose your bet</li>
                        </ul>
                      </div>
                    )}

                    {rulesTab === 'payouts' && (
                      <div className="tab-panel">
                        <ul>
                          <li><strong>Heads Win:</strong> 2:1 payout (double your bet)</li>
                          <li><strong>Tails Win:</strong> 2:1 payout (double your bet)</li>
                          <li>50/50 chance of winning on each flip</li>
                        </ul>
                      </div>
                    )}
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
            ? `You won! Result: ${result.result}` 
            : `Better luck next time! Result: ${result.result}`,
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

export default CoinFlipGame;
