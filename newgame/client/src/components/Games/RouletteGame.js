import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './RouletteGame.css';

function RouletteGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('roulette', {
    bet: 5,
    betType: 'number',
    betValue: '',
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betType, setBetType] = useState(settings.betType);
  const [betValue, setBetValue] = useState(settings.betValue);
  const [winningNumber, setWinningNumber] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [balance, setBalance] = useState(user?.balance || 0);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Update settings when they change
  useEffect(() => {
    updateSettings({ bet, betType, betValue, rulesTab });
  }, [bet, betType, betValue, rulesTab, updateSettings]);

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  const handleCloseResult = () => {
    setResult(null);
    setShowResultPopup(false);
  };

  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  const handleSpin = async () => {
    if (spinning || !betValue || balance < bet) return;

    setSpinning(true);
    setResult(null);
    setShowResultPopup(false);
    setNotificationTimer(5);
    setWinningNumber(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Animate spinning
    const spinDuration = 3000;
    const spinInterval = 50;
    let elapsed = 0;

    const spinAnimation = setInterval(() => {
      setWinningNumber(Math.floor(Math.random() * 38));
      elapsed += spinInterval;
      if (elapsed >= spinDuration) {
        clearInterval(spinAnimation);
        performSpin();
      }
    }, spinInterval);
  };

  const performSpin = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/roulette/play`,
        { bet, betType, betValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWinningNumber(response.data.winningNumber === '00' ? 37 : parseInt(response.data.winningNumber));
      setResult({
        winningNumber: response.data.winningNumber,
        win: response.data.win,
        bet: response.data.bet,
        won: response.data.won
      });
      setShowResultPopup(true);
      setBalance(response.data.balance);
      await fetchUser();
      setSpinning(false);
    } catch (error) {
      showError(error.response?.data?.message || 'Error spinning roulette. Please try again.');
      setSpinning(false);
    }
  };

  const getNumberColor = (num) => {
    if (num === 0 || num === 37) return 'green';
    if (redNumbers.includes(num)) return 'red';
    return 'black';
  };

  return (
    <div className="roulette-game-container">
      <GameHeader 
        title="🎡 Roulette"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="roulette-main">
        <div className="roulette-game-layout">
          <div className="roulette-board">
            <div className="game-area">
              <div className="roulette-table">
                <div className="roulette-wheel-container">
                  <div className={`roulette-wheel ${spinning ? 'spinning' : ''}`}>
                    <div className="wheel-number" style={{ 
                      backgroundColor: winningNumber !== null 
                        ? (getNumberColor(winningNumber) === 'red' ? '#c00' : 
                           getNumberColor(winningNumber) === 'black' ? '#000' : '#0a0')
                        : '#333'
                    }}>
                      {winningNumber === 37 ? '00' : winningNumber !== null ? winningNumber : '?'}
                    </div>
                  </div>
                  {result && (
                    <div className="result-display">
                      <div className={`outcome ${result.won ? 'win' : 'lose'}`}>
                        {result.won ? '🎉 Winner!' : '😔 Try Again'}
                      </div>
                      <div className="winning-number-display">
                        Winning Number: {result.winningNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="roulette-controls">
            <div className="betting-section">
            <h3>Place Your Bet</h3>
            
            <div className="bet-type-section">
              <label>Bet Type</label>
              <select
                id="roulette-bet-type"
                name="betType"
                value={betType}
                onChange={(e) => {
                  setBetType(e.target.value);
                  setBetValue('');
                }}
                className="bet-type-select"
                disabled={spinning}
              >
                <option value="number">Single Number (35:1)</option>
                <option value="color">Color (2:1)</option>
                <option value="evenodd">Even/Odd (2:1)</option>
                <option value="range">Range 1-18/19-36 (2:1)</option>
              </select>
            </div>

            {betType === 'number' && (
              <div className="bet-value-section">
                <label>Select Number</label>
                <select
                  id="roulette-number-select"
                  name="betNumber"
                  value={betValue}
                  onChange={(e) => setBetValue(e.target.value)}
                  className="bet-value-select"
                  disabled={spinning}
                >
                  <option value="">Choose a number</option>
                  <option value="0">0</option>
                  {numbers.slice(1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                  <option value="37">00</option>
                </select>
              </div>
            )}

            {betType === 'color' && (
              <div className="bet-value-section">
                <label>Select Color</label>
                <div className="color-buttons">
                  <button
                    type="button"
                    className={`color-btn red ${betValue === 'red' ? 'active' : ''}`}
                    onClick={() => setBetValue('red')}
                    disabled={spinning}
                  >
                    Red
                  </button>
                  <button
                    type="button"
                    className={`color-btn black ${betValue === 'black' ? 'active' : ''}`}
                    onClick={() => setBetValue('black')}
                    disabled={spinning}
                  >
                    Black
                  </button>
                </div>
              </div>
            )}

            {betType === 'evenodd' && (
              <div className="bet-value-section">
                <label>Select</label>
                <div className="evenodd-buttons">
                  <button
                    type="button"
                    className={`bet-option-btn ${betValue === 'even' ? 'active' : ''}`}
                    onClick={() => setBetValue('even')}
                    disabled={spinning}
                  >
                    Even
                  </button>
                  <button
                    type="button"
                    className={`bet-option-btn ${betValue === 'odd' ? 'active' : ''}`}
                    onClick={() => setBetValue('odd')}
                    disabled={spinning}
                  >
                    Odd
                  </button>
                </div>
              </div>
            )}

            {betType === 'range' && (
              <div className="bet-value-section">
                <label>Select Range</label>
                <div className="range-buttons">
                  <button
                    type="button"
                    className={`bet-option-btn ${betValue === '1-18' ? 'active' : ''}`}
                    onClick={() => setBetValue('1-18')}
                    disabled={spinning}
                  >
                    1-18
                  </button>
                  <button
                    type="button"
                    className={`bet-option-btn ${betValue === '19-36' ? 'active' : ''}`}
                    onClick={() => setBetValue('19-36')}
                    disabled={spinning}
                  >
                    19-36
                  </button>
                </div>
              </div>
            )}

            <div className="bet-amount-section">
              <label>Bet Amount</label>
              <BetControls
                bet={bet}
                setBet={setBet}
                balance={balance}
                minBet={5}
                maxBet={Math.min(balance, 100)}
                step={5}
                disabled={spinning}
                quickBetOptions={[5, 10, 25, 50, 100]}
              />
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning || balance < bet || !betValue}
              className="spin-btn"
            >
              {spinning ? 'Spinning...' : '🎡 Spin Wheel'}
            </button>
          </div>

          <div className="rules-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Predict where the ball will land on the roulette wheel. Choose from various betting options with different payout odds.</p>
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
                  className={`rules-tab ${rulesTab === 'bets' ? 'active' : ''}`}
                  onClick={() => setRulesTab('bets')}
                >
                  Bet Types
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
                      <li>Select a bet type (Number, Color, Even/Odd, or Range)</li>
                      <li>Choose your bet value based on the bet type</li>
                      <li>Set your bet amount (minimum $5)</li>
                      <li>Click "Spin Wheel" to spin the roulette wheel</li>
                      <li>Win if the ball lands on your chosen bet</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'bets' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Single Number:</strong> Bet on any number 0-36 or 00</li>
                      <li><strong>Color:</strong> Bet on Red or Black</li>
                      <li><strong>Even/Odd:</strong> Bet on Even or Odd numbers</li>
                      <li><strong>Range:</strong> Bet on 1-18 (Low) or 19-36 (High)</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Single Number:</strong> 35:1 payout</li>
                      <li><strong>Color:</strong> 2:1 payout</li>
                      <li><strong>Even/Odd:</strong> 2:1 payout</li>
                      <li><strong>Range:</strong> 2:1 payout</li>
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
            ? `Winning Number: ${result.winningNumber}`
            : `Winning Number: ${result.winningNumber}`,
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

export default RouletteGame;
