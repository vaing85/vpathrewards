import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './HiLoGame.css';

function HiLoGame() {
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('hilo', {
    bet: 5,
    betOn: 'high'
  });
  const [bet, setBet] = useState(settings.bet);
  const [betOn, setBetOn] = useState(settings.betOn);
  const [result, setResult] = useState(null);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [dealing, setDealing] = useState(false);
  const [animatingCards, setAnimatingCards] = useState([]);
  const [card, setCard] = useState(null);
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
    setCard(null);
    setAnimatingCards([]);
    setResult(null);
    setShowResultPopup(false);
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
    setCard(null);
    setResult(null);
    setShowResultPopup(false);
    
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/hilo/play`,
        { bet, betOn },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Animate dealing card
      setTimeout(() => {
        setCard(response.data.card);
        setAnimatingCards(['card']);
      }, 300);

      // Show result after card is dealt
      setTimeout(() => {
        setResult({
          card: response.data.card,
          win: response.data.win,
          bet: response.data.bet,
          won: response.data.win > 0
        });
        setShowResultPopup(true);
        setBalance(response.data.balance);
        setDealing(false);
        setAnimatingCards([]);
        fetchUser();
      }, 900);
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
      setDealing(false);
      setAnimatingCards([]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="game-container">
      <GameHeader 
        title="🃏 Hi-Lo"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="hilo-game">
        <div className="hilo-game-layout">
          <div className="hilo-board">
            <div className="card-area">
              <h3>Your Card</h3>
              {card ? (() => {
                const display = getCardDisplay(card);
                const isAnimating = animatingCards.includes('card');
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

          <div className="hilo-controls">
            <div className="betting-area">
          <div className="bet-type-selector">
            <label>Bet On:</label>
            <div className="bet-type-options">
              <button 
                className={`bet-type-btn ${betOn === 'high' ? 'active' : ''}`}
                onClick={() => setBetOn('high')}
                disabled={dealing}
              >
                High (8+)
              </button>
              <button 
                className={`bet-type-btn ${betOn === 'low' ? 'active' : ''}`}
                onClick={() => setBetOn('low')}
                disabled={dealing}
              >
                Low (2-7)
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

          <div className="bet-amount-control">
            <label>Bet Amount:</label>
            <div className="bet-input-group">
              <button 
                className="bet-btn bet-minus"
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
                id="hilo-bet"
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
                className="bet-btn bet-plus"
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
              className="btn btn-primary"
            >
              {dealing || loading ? 'Drawing...' : 'Draw Card'}
            </button>
          ) : (
            <div className="game-buttons-container">
              <button
                onClick={handlePlay}
                disabled={dealing || balance < bet}
                className="btn btn-primary"
              >
                {dealing || loading ? 'Drawing...' : 'Draw Card'}
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

export default HiLoGame;
