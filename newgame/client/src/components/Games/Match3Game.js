import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import BetControls from './Shared/BetControls';
import ResultOverlay from './Shared/ResultOverlay';
import GameHeader from './Shared/GameHeader';
import './Match3Game.css';

const GRID_SIZE = 8;
const GEM_TYPES = ['💎', '🔴', '💚', '💙', '💛', '🧡', '💜', '❤️'];
const MIN_MATCH = 3;
const TARGET_SCORE = 1000; // Score needed to win

function Match3Game() {
  const { user, fetchUser } = useAuth();
  const { showError, showWarning, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const [settings, updateSettings] = useGameSettings('match3', {
    bet: 10,
    rulesTab: 'howtoplay'
  });
  const [bet, setBet] = useState(settings.bet);
  const [grid, setGrid] = useState([]);
  const [selectedGem, setSelectedGem] = useState(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [rulesTab, setRulesTab] = useState(settings.rulesTab);
  const [result, setResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [matchedGems, setMatchedGems] = useState(new Set());
  const [scorePopups, setScorePopups] = useState([]);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  const [swappingGems, setSwappingGems] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setBalance(user.balance);
    }
  }, [user]);

  // Update settings when bet or rulesTab changes
  useEffect(() => {
    updateSettings({ bet, rulesTab });
  }, [bet, rulesTab, updateSettings]);

  // Generate random gem
  const getRandomGem = () => {
    return GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
  };

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const newGrid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newGrid[row][col] = getRandomGem();
      }
    }
    // Remove initial matches
    let hasMatches = true;
    while (hasMatches) {
      const matches = findMatches(newGrid);
      if (matches.length === 0) {
        hasMatches = false;
      } else {
        matches.forEach(({ row, col }) => {
          newGrid[row][col] = getRandomGem();
        });
      }
    }
    return newGrid;
  }, []);

  // Find all matches in grid
  const findMatches = (gridToCheck) => {
    const matches = [];
    const checked = new Set();

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      let count = 1;
      let currentGem = gridToCheck[row][0];
      for (let col = 1; col < GRID_SIZE; col++) {
        if (gridToCheck[row][col] === currentGem) {
          count++;
        } else {
          if (count >= MIN_MATCH) {
            for (let c = col - count; c < col; c++) {
              const key = `${row}-${c}`;
              if (!checked.has(key)) {
                matches.push({ row, col: c });
                checked.add(key);
              }
            }
          }
          count = 1;
          currentGem = gridToCheck[row][col];
        }
      }
      if (count >= MIN_MATCH) {
        for (let c = GRID_SIZE - count; c < GRID_SIZE; c++) {
          const key = `${row}-${c}`;
          if (!checked.has(key)) {
            matches.push({ row, col: c });
            checked.add(key);
          }
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      let count = 1;
      let currentGem = gridToCheck[0][col];
      for (let row = 1; row < GRID_SIZE; row++) {
        if (gridToCheck[row][col] === currentGem) {
          count++;
        } else {
          if (count >= MIN_MATCH) {
            for (let r = row - count; r < row; r++) {
              const key = `${r}-${col}`;
              if (!checked.has(key)) {
                matches.push({ row: r, col });
                checked.add(key);
              }
            }
          }
          count = 1;
          currentGem = gridToCheck[row][col];
        }
      }
      if (count >= MIN_MATCH) {
        for (let r = GRID_SIZE - count; r < GRID_SIZE; r++) {
          const key = `${r}-${col}`;
          if (!checked.has(key)) {
            matches.push({ row: r, col });
            checked.add(key);
          }
        }
      }
    }

    return matches;
  };

  // Swap two gems
  const swapGems = (gridToSwap, row1, col1, row2, col2) => {
    const newGrid = gridToSwap.map(row => [...row]);
    [newGrid[row1][col1], newGrid[row2][col2]] = [newGrid[row2][col2], newGrid[row1][col1]];
    return newGrid;
  };

  // Check if swap creates a match
  const isValidSwap = (row1, col1, row2, col2) => {
    const testGrid = swapGems(grid, row1, col1, row2, col2);
    const matches = findMatches(testGrid);
    return matches.length > 0;
  };

  // Remove matches and cascade
  const processMatches = useCallback(async (currentGrid) => {
    let newGrid = currentGrid.map(row => [...row]);
    let totalScore = 0;
    let hasMatches = true;
    let comboCount = 0;

    while (hasMatches) {
      const matches = findMatches(newGrid);
      if (matches.length === 0) {
        hasMatches = false;
      } else {
        comboCount++;
        const multiplier = Math.min(1 + (comboCount - 1) * 0.5, 3); // Max 3x multiplier
        setComboMultiplier(multiplier);

        // Show matched gems animation
        const matchKeys = matches.map(({ row, col }) => `${row}-${col}`);
        setMatchedGems(new Set(matchKeys));

        // Calculate score with combo multiplier
        const baseScore = matches.length * 10;
        const matchScore = Math.floor(baseScore * multiplier);
        totalScore += matchScore;
        setScore(prev => prev + matchScore);

        // Add score popup
        const avgRow = matches.reduce((sum, m) => sum + m.row, 0) / matches.length;
        const avgCol = matches.reduce((sum, m) => sum + m.col, 0) / matches.length;
        const popupId = Date.now() + Math.random();
        setScorePopups(prev => [...prev, {
          id: popupId,
          score: matchScore,
          multiplier: multiplier > 1 ? `x${multiplier.toFixed(1)}` : null,
          row: avgRow,
          col: avgCol
        }]);

        // Remove popup after animation
        setTimeout(() => {
          setScorePopups(prev => prev.filter(p => p.id !== popupId));
        }, 1500);

        // Wait for match animation
        await new Promise(resolve => setTimeout(resolve, 400));

        // Remove matched gems
        matches.forEach(({ row, col }) => {
          newGrid[row][col] = null;
        });
        setMatchedGems(new Set());

        // Cascade gems down with animation
        for (let col = 0; col < GRID_SIZE; col++) {
          let writeIndex = GRID_SIZE - 1;
          for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (newGrid[row][col] !== null) {
              newGrid[writeIndex][col] = newGrid[row][col];
              if (writeIndex !== row) {
                newGrid[row][col] = null;
              }
              writeIndex--;
            }
          }
          // Fill empty spaces at top
          for (let row = writeIndex; row >= 0; row--) {
            newGrid[row][col] = getRandomGem();
          }
        }

        // Small delay for cascade animation
        await new Promise(resolve => setTimeout(resolve, 300));
        setGrid([...newGrid]);
      }
    }

    // Reset combo multiplier after all matches processed
    setComboMultiplier(1);
    return totalScore;
  }, []);

  // Handle gem click
  const handleGemClick = async (row, col) => {
    if (!gameActive || isProcessing) return;

    if (selectedGem === null) {
      setSelectedGem({ row, col });
    } else {
      const { row: prevRow, col: prevCol } = selectedGem;
      
      // Check if adjacent
      const isAdjacent = 
        (Math.abs(row - prevRow) === 1 && col === prevCol) ||
        (Math.abs(col - prevCol) === 1 && row === prevRow);

      if (isAdjacent) {
        // Check if swap is valid
        if (isValidSwap(prevRow, prevCol, row, col)) {
          setIsProcessing(true);
          setMoves(prev => prev - 1);
          
          // Animate swap
          setSwappingGems({ from: { row: prevRow, col: prevCol }, to: { row, col } });
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Swap gems
          let newGrid = swapGems(grid, prevRow, prevCol, row, col);
          setGrid(newGrid);
          setSelectedGem(null);
          setSwappingGems(null);

          // Process matches
          await processMatches(newGrid);
          setIsProcessing(false);
        } else {
          // Invalid swap - shake animation
          setSelectedGem(null);
          setTimeout(() => setSelectedGem({ row, col }), 100);
        }
      } else {
        setSelectedGem({ row, col });
      }
    }
  };

  // Start game
  const handleStartGame = async () => {
    if (bet > 100) {
      showWarning('Maximum bet is $100. Your bet has been adjusted.');
      setBet(100);
      return;
    }
    if (balance < bet) {
      showInsufficientBalance(bet, balance);
      return;
    }

    try {
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/games/match3/play`,
        { bet },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Deduct bet
      setBalance(response.data.balance);
      await fetchUser();

      // Initialize game
      const newGrid = initializeGrid();
      setGrid(newGrid);
      setScore(0);
      setMoves(30);
      setGameActive(true);
      setGameWon(false);
      setGameLost(false);
      setSelectedGem(null);
    } catch (error) {
      showError(error.response?.data?.message || 'Error starting game. Please try again.');
    }
  };

  // Handle game end
  const handleGameEnd = useCallback(async (won) => {
    try {
      const token = getAuthToken();
      const winAmount = won ? bet * 2 : 0;
      
      // Update balance with winnings
      const response = await axios.post(
        `${API_URL}/games/match3/win`,
        { bet, win: winAmount, score, won },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBalance(response.data.balance);
      await fetchUser();

      setResult({
        won,
        win: winAmount,
        bet,
        score
      });
      setShowResultOverlay(true);

      // Show confetti on big wins (score > 1500 or win > bet * 3)
      if (won && (score > 1500 || winAmount > bet * 3)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }, [bet, score, API_URL, fetchUser]);

  // Check win/loss conditions
  useEffect(() => {
    if (!gameActive) return;

    if (score >= TARGET_SCORE) {
      setGameWon(true);
      setGameActive(false);
      handleGameEnd(true);
    } else if (moves <= 0) {
      setGameLost(true);
      setGameActive(false);
      handleGameEnd(false);
    }
  }, [score, moves, gameActive, handleGameEnd]);


  const handleCloseResult = () => {
    setResult(null);
    setShowResultOverlay(false);
    // Reset game state
    setGrid([]);
    setGameActive(false);
    setGameWon(false);
    setGameLost(false);
    setScore(0);
    setMoves(30);
    setMatchedGems(new Set());
    setScorePopups([]);
    setComboMultiplier(1);
    setShowConfetti(false);
    setSwappingGems(null);
  };

  return (
    <div className="match3-game-container">
      <GameHeader 
        title="🎮 Match 3"
        balance={balance}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="match3-main">
        <div className="match3-game-layout">
          <div className="match3-board">
          {!gameActive && grid.length === 0 ? (
            <div className="game-start-screen">
              <div className="start-content">
                <div className="start-icon">🎮</div>
                <h2>Match 3 Puzzle</h2>
                <p>Match 3 or more gems to score points!</p>
                <p className="target-info">Target Score: {TARGET_SCORE}</p>
                <p className="target-info">Moves: 30</p>
              </div>
            </div>
          ) : (
            <div className="game-area">
              {gameWon && (
                <div className="game-message win-message">
                  <h2>🎉 You Won!</h2>
                  <p>Score: {score}</p>
                </div>
              )}

              {gameLost && (
                <div className="game-message lose-message">
                  <h2>😔 Game Over</h2>
                  <p>Final Score: {score}</p>
                </div>
              )}

              <div className="match3-grid">
                {grid.map((row, rowIndex) =>
                  row.map((gem, colIndex) => {
                    const isSelected = selectedGem?.row === rowIndex && selectedGem?.col === colIndex;
                    const isMatched = matchedGems.has(`${rowIndex}-${colIndex}`);
                    const isSwapping = swappingGems && (
                      (swappingGems.from.row === rowIndex && swappingGems.from.col === colIndex) ||
                      (swappingGems.to.row === rowIndex && swappingGems.to.col === colIndex)
                    );
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`gem-cell ${isSelected ? 'selected' : ''} ${isProcessing ? 'processing' : ''} ${isMatched ? 'matched' : ''} ${isSwapping ? 'swapping' : ''}`}
                        onClick={() => handleGemClick(rowIndex, colIndex)}
                      >
                        {gem}
                      </div>
                    );
                  })
                )}
                {scorePopups.map(popup => (
                  <div
                    key={popup.id}
                    className="score-popup"
                    style={{
                      gridRow: Math.floor(popup.row) + 1,
                      gridColumn: Math.floor(popup.col) + 1
                    }}
                  >
                    <div className="popup-score">+{popup.score}</div>
                    {popup.multiplier && (
                      <div className="popup-multiplier">{popup.multiplier}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!gameActive && grid.length === 0 && (
            <div className="betting-section">
              <h3>Start Game</h3>
              <div className="bet-amount-section">
                <div className="selected-bet-display">
                  <span className="bet-label">Selected Bet:</span>
                  <span className="bet-amount">${bet}</span>
                </div>
                <div className="bet-options">
                  {[5, 10, 25, 50, 100].filter(amount => amount <= 100).map(amount => (
                    <button
                      key={amount}
                      type="button"
                      className={`bet-option-btn ${bet === amount ? 'active' : ''} ${balance < amount ? 'disabled' : ''}`}
                      onClick={() => {
                        if (balance >= amount && amount <= 100) {
                          setBet(Math.min(amount, 100));
                        }
                      }}
                      disabled={balance < amount || amount > 100}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                
                <BetControls
                  bet={bet}
                  setBet={setBet}
                  balance={balance}
                  minBet={5}
                  maxBet={100}
                  step={5}
                  disabled={gameActive}
                  quickBetOptions={[5, 10, 25, 50, 100]}
                />
              </div>

              <div className="game-buttons-container">
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={balance < bet}
                  className="play-btn"
                >
                  🎮 Start Game
                </button>
              </div>
            </div>
          )}

          {gameActive && (
            <div className="game-info-active">
              <p>💡 Click adjacent gems to swap and match 3+</p>
            </div>
          )}
          </div>

          <div className="match3-controls">
            <div className="controls-row">
              <div className="betting-section">
            <h3>Game Rules</h3>
            <div className="rules-content">
              <div className="rules-objective">
                <p><strong>Objective:</strong> Match 3 or more gems of the same type to score points. Reach {TARGET_SCORE} points in 30 moves to win!</p>
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
                      <li>Click a gem to select it</li>
                      <li>Click an adjacent gem to swap</li>
                      <li>Match 3+ gems in a row or column</li>
                      <li>Matched gems disappear and new ones fall</li>
                      <li>Reach {TARGET_SCORE} points in 30 moves to win</li>
                      <li>Each match gives 10 points per gem</li>
                    </ul>
                  </div>
                )}

                {rulesTab === 'payouts' && (
                  <div className="tab-panel">
                    <ul>
                      <li><strong>Win:</strong> Reach {TARGET_SCORE} points = 2x your bet</li>
                      <li><strong>Lose:</strong> Run out of moves = lose your bet</li>
                      <li>Score bonus: Higher scores = better rewards</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="rules-section">
                <h3>Game Rules</h3>
                <div className="rules-content">
                  <div className="rules-objective">
                    <p><strong>Objective:</strong> Match 3 or more gems of the same type to score points. Reach {TARGET_SCORE} points in 30 moves to win!</p>
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
                          <li>Click a gem to select it</li>
                          <li>Click an adjacent gem to swap</li>
                          <li>Match 3+ gems in a row or column</li>
                          <li>Matched gems disappear and new ones fall</li>
                          <li>Reach {TARGET_SCORE} points in 30 moves to win</li>
                          <li>Each match gives 10 points per gem</li>
                        </ul>
                      </div>
                    )}

                    {rulesTab === 'payouts' && (
                      <div className="tab-panel">
                        <ul>
                          <li><strong>Win:</strong> Reach {TARGET_SCORE} points = 2x your bet</li>
                          <li><strong>Lose:</strong> Run out of moves = lose your bet</li>
                          <li>Score bonus: Higher scores = better rewards</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {gameActive && (
                  <div className="game-stats-right">
                    <h4>Game Stats</h4>
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Score:</span>
                        <span className="stat-value">{score}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Target:</span>
                        <span className="stat-value">{TARGET_SCORE}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Moves:</span>
                        <span className="stat-value">{moves}</span>
                      </div>
                      {comboMultiplier > 1 && (
                        <div className="stat-item combo-indicator">
                          <span className="stat-label">Combo:</span>
                          <span className="stat-value combo-value">x{comboMultiplier.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
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
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#95e1d3'][Math.floor(Math.random() * 6)]
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
            ? `You won! Score: ${result.score}`
            : `Final Score: ${result.score}. Try again!`,
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

export default Match3Game;
