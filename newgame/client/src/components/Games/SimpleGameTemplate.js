import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import './SimpleGame.css';

function SimpleGameTemplate({ gameName, gameTitle, gameDescription, betOptions = [10, 25, 50, 100], isCardGame = false, isWheelGame = false }) {
  // Load saved settings from localStorage
  const loadSettings = () => {
    const saved = localStorage.getItem(`${gameName}_settings`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const savedSettings = loadSettings();
  const { user, fetchUser } = useAuth();
  const { showError } = useNotification();
  const navigate = useNavigate();
  const [bet, setBet] = useState(savedSettings?.bet || 10);
  const [result, setResult] = useState(null);
  const [resultClosing, setResultClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(savedSettings?.rulesTab || 'howtoplay'); // 'howtoplay' or 'rules'
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`${gameName}_settings`, JSON.stringify({ bet, rulesTab }));
  }, [bet, rulesTab, gameName]);

  const handlePlay = async () => {
    if (bet > balance) {
      showError('Insufficient balance. Please deposit more funds or reduce your bet.');
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/${gameName}/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(response.data);
      setBalance(response.data.balance);
      await fetchUser();
    } catch (error) {
      showError(error.response?.data?.message || 'Error playing game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseResult = () => {
    setResultClosing(true);
    setTimeout(() => {
      setResult(null);
      setResultClosing(false);
    }, 300);
  };

  // Auto-dismiss result after 5 seconds
  useEffect(() => {
    if (result) {
      const autoDismissTimer = setTimeout(() => {
        setResultClosing(true);
        setTimeout(() => {
          setResult(null);
          setResultClosing(false);
        }, 300);
      }, 5000);

      return () => clearTimeout(autoDismissTimer);
    }
  }, [result]);

  // Card games use two-column layout, others use single column
  if (isCardGame) {
    return (
      <div className="game-container card-game-container">
        <div className="game-header">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">← Back to Dashboard</button>
          <h1>{gameTitle}</h1>
          <div className="balance">Balance: ${balance.toFixed(2)}</div>
        </div>

        <div className="card-game-table">
          <div className="table-layout">
            <div className="game-column">
              <div className="table-felt">
                <div className="game-area">
                  {result ? (
                    <div className="game-result-display">
                      <h2>{result.won ? '🎉 You Won!' : 'Better Luck Next Time!'}</h2>
                      {result.won ? (
                        <p>Winnings: ${result.win?.toFixed(2)}</p>
                      ) : (
                        <p>You lost ${result.bet?.toFixed(2)}</p>
                      )}
                      {result.multiplier && <p>Multiplier: {result.multiplier}x</p>}
                    </div>
                  ) : (
                    <div className="game-placeholder">
                      <p>{gameDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {result && (
              <div 
                className={`result-overlay ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}
                onClick={(e) => {
                  if (e.target.classList.contains('result-overlay')) {
                    handleCloseResult();
                  }
                }}
              >
                <div className={`result ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}>
                  <button 
                    className="result-close-btn"
                    onClick={handleCloseResult}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <div className="result-icon">
                    {result.won && <span className="win-icon">🎉</span>}
                    {!result.won && <span className="lose-icon">😔</span>}
                  </div>
                  <h2>{result.won ? 'You Won!' : 'Better Luck Next Time!'}</h2>
                  {result.won ? (
                    <p className="win-amount">Winnings: ${result.win?.toFixed(2)}</p>
                  ) : (
                    <p className="lose-amount">You lost ${result.bet?.toFixed(2)}</p>
                  )}
                  {result.multiplier && <p style={{ marginTop: '10px', fontSize: '14px' }}>Multiplier: {result.multiplier}x</p>}
                </div>
              </div>
            )}

            <div className="betting-column">
              <div className="betting-area">
                <div className="game-rules">
                  <h3>Game Rules</h3>
                  <div className="rules-content">
                    <div className="rules-objective">
                      <p><strong>Objective:</strong> {gameDescription}</p>
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
                        className={`rules-tab ${rulesTab === 'rules' ? 'active' : ''}`}
                        onClick={() => setRulesTab('rules')}
                        type="button"
                      >
                        Rules
                      </button>
                    </div>

                    <div className="rules-tab-content">
                      {rulesTab === 'howtoplay' && (
                        <div className="tab-panel">
                          <ul>
                            <li>Place your bet using the controls</li>
                            <li>Click Play to start the game</li>
                            <li>Win or lose based on game outcome</li>
                          </ul>
                        </div>
                      )}
                      {rulesTab === 'rules' && (
                        <div className="tab-panel">
                          <ul>
                            <li>Follow standard game rules</li>
                            <li>Bet amount determines potential winnings</li>
                            <li>Check game-specific rules for details</li>
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
                        id={`${gameName}-bet`}
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

                  <button 
                    className="btn btn-primary btn-deal" 
                    onClick={handlePlay} 
                    disabled={loading || bet > balance}
                  >
                    {loading ? 'Playing...' : 'Play'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wheel games use side-by-side layout
  if (isWheelGame) {
    return (
      <div className="game-container simple-wheel-container">
        <div className="game-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
          <h1>{gameTitle}</h1>
          <div className="balance">Balance: ${balance.toFixed(2)}</div>
        </div>

        <div className="simple-wheel-main">
          <div className="simple-wheel-layout">
            <div className="simple-wheel-board">
              <div className="game-area">
                {result ? (
                  <div className="game-result-display">
                    <h2>{result.won ? '🎉 You Won!' : 'Better Luck Next Time!'}</h2>
                    {result.won ? (
                      <p>Winnings: ${result.win?.toFixed(2)}</p>
                    ) : (
                      <p>You lost ${result.bet?.toFixed(2)}</p>
                    )}
                    {result.multiplier && <p>Multiplier: {result.multiplier}x</p>}
                  </div>
                ) : (
                  <div className="game-placeholder">
                    <p>{gameDescription}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="simple-wheel-controls">
              <div className="betting-controls">
                <div className="bet-control">
                  <h4>Bet Amount</h4>
                  <div className="bet-options">
                    {betOptions.map(amount => (
                      <button
                        key={amount}
                        className={`bet-btn ${bet === amount ? 'active' : ''}`}
                        onClick={() => setBet(amount)}
                        disabled={loading || amount > balance}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    id={`${gameName}-bet`}
                    name="bet"
                    min="1"
                    max={Math.min(balance, 100)}
                    value={bet}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setBet(Math.min(value, Math.min(balance, 100)));
                    }}
                    className="bet-input"
                    disabled={loading}
                  />
                </div>

                <button
                  className="btn btn-primary btn-play"
                  onClick={handlePlay}
                  disabled={loading || bet > balance}
                >
                  {loading ? 'Playing...' : 'Play'}
                </button>
              </div>

              <div className="game-rules">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> {gameDescription}</p>
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
                      className={`rules-tab ${rulesTab === 'rules' ? 'active' : ''}`}
                      onClick={() => setRulesTab('rules')}
                      type="button"
                    >
                      Rules
                    </button>
                  </div>

                  <div className="rules-tab-content">
                    {rulesTab === 'howtoplay' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Place your bet using the controls</li>
                          <li>Click Play to start the game</li>
                          <li>Win or lose based on game outcome</li>
                        </ul>
                      </div>
                    )}
                    {rulesTab === 'rules' && (
                      <div className="tab-panel">
                        <ul>
                          <li>Follow standard game rules</li>
                          <li>Bet amount determines potential winnings</li>
                          <li>Check game-specific rules for details</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {result && (
          <div
            className={`result-overlay ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}
            onClick={(e) => {
              if (e.target.classList.contains('result-overlay')) {
                handleCloseResult();
              }
            }}
          >
            <div className={`result ${result.won ? 'win' : 'lose'} ${resultClosing ? 'closing' : ''}`}>
              <button
                className="result-close-btn"
                onClick={handleCloseResult}
                aria-label="Close"
              >
                ×
              </button>
              <div className="result-icon">
                {result.won && <span className="win-icon">🎉</span>}
                {!result.won && <span className="lose-icon">😔</span>}
              </div>
              <h2>{result.won ? 'You Won!' : 'Better Luck Next Time!'}</h2>
              {result.won ? (
                <p className="win-amount">Winnings: ${result.win?.toFixed(2)}</p>
              ) : (
                <p className="lose-amount">You lost ${result.bet?.toFixed(2)}</p>
              )}
              {result.multiplier && <p style={{ marginTop: '10px', fontSize: '14px' }}>Multiplier: {result.multiplier}x</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-card games use original single-column layout
  return (
    <div className="game-container">
      <div className="game-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
        <h1>{gameTitle}</h1>
        <div className="balance">Balance: ${balance.toFixed(2)}</div>
      </div>

      <div className="game-content">
        <div className="game-info">
          <p>{gameDescription}</p>
        </div>

        <div className="bet-section">
          <h3>Place Your Bet</h3>
          <div className="bet-options">
            {betOptions.map(amount => (
              <button
                key={amount}
                className={`bet-btn ${bet === amount ? 'active' : ''}`}
                onClick={() => setBet(amount)}
              >
                ${amount}
              </button>
            ))}
          </div>
          <input
            type="number"
            id={`${gameName}-bet`}
            name="bet"
            value={bet}
            onChange={(e) => {
              const value = Number(e.target.value);
              setBet(Math.min(value, Math.min(balance, 100)));
            }}
            min="1"
            max={Math.min(balance, 100)}
            className="bet-input"
          />
        </div>

        <button
          className="play-btn"
          onClick={handlePlay}
          disabled={loading || bet > balance}
        >
          {loading ? 'Playing...' : 'Play'}
        </button>

        {result && (
          <div className={`result ${result.won ? 'win' : 'lose'}`}>
            {result.won ? (
              <div>
                <h2>🎉 You Won!</h2>
                <p>Winnings: ${result.win?.toFixed(2)}</p>
                {result.multiplier && <p>Multiplier: {result.multiplier}x</p>}
              </div>
            ) : (
              <div>
                <h2>Better Luck Next Time!</h2>
                <p>You lost ${result.bet?.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleGameTemplate;

