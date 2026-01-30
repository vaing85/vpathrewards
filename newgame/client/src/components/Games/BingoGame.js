import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useGameSettings } from '../../hooks/useGameSettings';
import GameHeader from './Shared/GameHeader';
import './BingoGame.css';

function BingoGame() {
  const [bet, setBet] = useState(10);
  const [numCards, setNumCards] = useState(1);
  const [bingoCards, setBingoCards] = useState([]);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [drawingAnimation, setDrawingAnimation] = useState(false);
  const [autoDraw, setAutoDraw] = useState(false);
  const [drawSpeed, setDrawSpeed] = useState(1000); // milliseconds between draws
  const autoDrawIntervalRef = useRef(null);
  const gameStateRef = useRef({ gameActive: false, drawnNumbers: [], bingoCards: [], selectedNumbers: [] });
  const MAX_DRAWS = 25; // Maximum numbers that can be drawn
  const { user, fetchUser } = useAuth();
  const { showError, showInsufficientBalance } = useNotification();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleStartGame = async () => {
    const required = bet * numCards;
    if (user.balance < required) {
      showInsufficientBalance(required, user.balance);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/games/bingo/play`, { 
        bet,
        numCards 
      });
      const cards = response.data.bingoCards || (response.data.bingoCard ? [response.data.bingoCard] : []);
      setBingoCards(cards);
      setDrawnNumbers([]);
      // Initialize selectedNumbers as array of arrays (one per card)
      const initialSelected = Array(cards.length).fill(null).map(() => []);
      setSelectedNumbers(initialSelected);
      setGameActive(true);
      setResult(null);
      // Update refs
      gameStateRef.current = {
        gameActive: true,
        drawnNumbers: [],
        bingoCards: cards,
        selectedNumbers: initialSelected
      };
      await fetchUser();
    } catch (error) {
      showError(error.response?.data?.message || 'Error starting game. Please try again.');
    }
  };

  const handleDrawNumber = async () => {
    const currentState = gameStateRef.current;
    if (!currentState.gameActive) return;
    
    // Check if we've reached the maximum number of draws
    if (currentState.drawnNumbers.length >= MAX_DRAWS) {
      setAutoDraw(false);
      setGameActive(false);
      gameStateRef.current.gameActive = false;
      setResult({
        win: false,
        message: 'Game Over - No BINGO!',
        amount: 0
      });
      return;
    }

    setDrawingAnimation(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    let newNumber;
    do {
      newNumber = Math.floor(Math.random() * 75) + 1;
    } while (currentState.drawnNumbers.includes(newNumber));

    const newDrawnNumbers = [...currentState.drawnNumbers, newNumber];
    setDrawnNumbers(newDrawnNumbers);
    setDrawingAnimation(false);

    // Update ref
    gameStateRef.current.drawnNumbers = newDrawnNumbers;

    // Check if number is on any card
    currentState.bingoCards.forEach((card, cardIndex) => {
      const isOnCard = card.some(row => row.includes(newNumber));
      if (isOnCard) {
        const cardSelectedNumbers = currentState.selectedNumbers[cardIndex] || [];
        if (!cardSelectedNumbers.includes(newNumber)) {
          const updatedSelected = [...currentState.selectedNumbers];
          updatedSelected[cardIndex] = [...cardSelectedNumbers, newNumber];
          setSelectedNumbers(updatedSelected);
          gameStateRef.current.selectedNumbers = updatedSelected;
          checkBingo(updatedSelected[cardIndex], card, cardIndex);
        }
      }
    });
  };

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = {
      gameActive,
      drawnNumbers,
      bingoCards,
      selectedNumbers
    };
  }, [gameActive, drawnNumbers, bingoCards, selectedNumbers]);

  // Check for game end when max draws reached
  useEffect(() => {
    if (drawnNumbers.length >= MAX_DRAWS && gameActive && !result) {
      setAutoDraw(false);
      setGameActive(false);
      gameStateRef.current.gameActive = false;
      setResult({
        win: false,
        message: 'Game Over - No BINGO!',
        amount: 0
      });
    }
  }, [drawnNumbers.length, gameActive, result]);

  // Auto-draw effect
  useEffect(() => {
    if (!autoDraw || !gameActive) {
      if (autoDrawIntervalRef.current) {
        clearInterval(autoDrawIntervalRef.current);
        autoDrawIntervalRef.current = null;
      }
      return;
    }

    if (drawnNumbers.length >= MAX_DRAWS) {
      setAutoDraw(false);
      return;
    }

    autoDrawIntervalRef.current = setInterval(() => {
      handleDrawNumber();
    }, drawSpeed);

    return () => {
      if (autoDrawIntervalRef.current) {
        clearInterval(autoDrawIntervalRef.current);
        autoDrawIntervalRef.current = null;
      }
    };
  }, [autoDraw, gameActive, drawSpeed, drawnNumbers.length]);

  // Stop auto-draw when game ends
  useEffect(() => {
    if (result || !gameActive) {
      setAutoDraw(false);
    }
  }, [result, gameActive]);

  const checkBingo = (numbers, card, cardIndex) => {
    // Check rows
    for (let i = 0; i < 5; i++) {
      const row = card[i];
      if (row.every(cell => cell === 'FREE' || numbers.includes(cell))) {
        setGameActive(false);
        gameStateRef.current.gameActive = false;
        const winAmount = bet * 5;
        setResult({ 
          win: true, 
          message: `BINGO! Card ${cardIndex + 1} - Row ${i + 1}!`, 
          amount: winAmount,
          cardIndex 
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        return;
      }
    }

    // Check columns
    for (let j = 0; j < 5; j++) {
      const column = card.map(row => row[j]);
      if (column.every(cell => cell === 'FREE' || numbers.includes(cell))) {
        setGameActive(false);
        gameStateRef.current.gameActive = false;
        const winAmount = bet * 5;
        setResult({ 
          win: true, 
          message: `BINGO! Card ${cardIndex + 1} - Column ${j + 1}!`, 
          amount: winAmount,
          cardIndex 
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        return;
      }
    }

    // Check diagonal
    const diag1 = [card[0][0], card[1][1], card[2][2], card[3][3], card[4][4]];
    if (diag1.every(cell => cell === 'FREE' || numbers.includes(cell))) {
      setGameActive(false);
      gameStateRef.current.gameActive = false;
      const winAmount = bet * 10;
      setResult({ 
        win: true, 
        message: `BINGO! Card ${cardIndex + 1} - Diagonal!`, 
        amount: winAmount,
        cardIndex 
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      return;
    }

    const diag2 = [card[0][4], card[1][3], card[2][2], card[3][1], card[4][0]];
    if (diag2.every(cell => cell === 'FREE' || numbers.includes(cell))) {
      setGameActive(false);
      gameStateRef.current.gameActive = false;
      const winAmount = bet * 10;
      setResult({ 
        win: true, 
        message: `BINGO! Card ${cardIndex + 1} - Diagonal!`, 
        amount: winAmount,
        cardIndex 
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      return;
    }
  };

  return (
    <div className="bingo-game-container">
      <GameHeader 
        title="🎱 Bingo"
        balance={user?.balance || 0}
        backPath="/dashboard"
        backLabel="← Back to Dashboard"
      />

      <div className="bingo-game">
        {bingoCards.length === 0 ? (
          <div className="start-screen">
            <div className="bet-control">
              <label>Bet Amount per Card:</label>
              <div className="bet-options">
                {[5, 10, 15, 20, 25, 50, 100].map(amount => (
                  <button
                    key={amount}
                    className={`bet-option-btn ${bet === amount ? 'active' : ''}`}
                    onClick={() => setBet(Math.min(amount, Math.min(user?.balance || 0, 100)))}
                    disabled={amount > (user?.balance || 0)}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                id="bingo-bet"
                name="bet"
                min="1"
                max={Math.min(user?.balance || 0, 100)}
                value={bet}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setBet(Math.min(value, Math.min(user?.balance || 0, 100)));
                }}
                className="bet-input"
              />
            </div>
            <div className="cards-control">
              <label>Number of Cards (1-4):</label>
              <div className="cards-selector">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    className={`card-option-btn ${numCards === num ? 'active' : ''}`}
                    onClick={() => setNumCards(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="total-bet-info">
                Total Bet: ${bet * numCards} ({numCards} card{numCards > 1 ? 's' : ''} × ${bet})
              </p>
            </div>
            <button 
              onClick={handleStartGame} 
              className="btn btn-primary"
              disabled={user?.balance < bet * numCards}
            >
              Start Game with {numCards} Card{numCards > 1 ? 's' : ''}
            </button>
          </div>
        ) : (
          <>
            <div className="bingo-game-layout">
              <div className="bingo-board">
                <div className="bingo-cards-grid">
                {bingoCards.map((card, cardIndex) => (
                  <div key={cardIndex} className="bingo-card-container">
                    <h3>Card {cardIndex + 1}</h3>
                    <div className={`bingo-card ${result?.cardIndex === cardIndex ? 'winning-card' : ''}`}>
                      {card.map((row, rowIndex) => (
                        <div key={rowIndex} className="bingo-row">
                          {row.map((cell, cellIndex) => (
                            <div
                              key={cellIndex}
                              className={`bingo-cell ${
                                cell === 'FREE'
                                  ? 'free'
                                  : (selectedNumbers[cardIndex] || []).includes(cell)
                                  ? 'selected'
                                  : ''
                              }`}
                            >
                              {cell}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                </div>
              </div>

              <div className="bingo-controls">
                <div className="controls-row">
                  <div className="betting-section">
                    <h3>Game Controls</h3>
                    
                    <div className="drawn-numbers">
                      <h4>Drawn Numbers:</h4>
                      <div className="numbers-list">
                        {drawnNumbers.length === 0 ? (
                          <p className="no-numbers">No numbers drawn yet</p>
                        ) : (
                          drawnNumbers.map((num, index) => (
                            <span key={index} className="drawn-number">
                              {num}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Always show button if game is active, or show message if not */}
                    {gameActive && !result ? (
                      <div className="draw-button-container">
                        <button 
                          onClick={handleDrawNumber} 
                          className="btn btn-primary btn-draw-number"
                          disabled={drawingAnimation || autoDraw}
                        >
                          {drawingAnimation ? (
                            <>
                              <span className="spinner">🎰</span> Drawing...
                            </>
                          ) : (
                            <>
                              <span className="draw-icon">🎲</span> Draw Number
                            </>
                          )}
                        </button>
                        
                        <div className="auto-draw-controls">
                          <button
                            onClick={() => setAutoDraw(!autoDraw)}
                            className={`btn btn-auto-draw ${autoDraw ? 'active' : ''}`}
                            disabled={drawingAnimation}
                          >
                            {autoDraw ? (
                              <>
                                <span>⏸</span> Stop Auto-Draw
                              </>
                            ) : (
                              <>
                                <span>▶</span> Start Auto-Draw
                              </>
                            )}
                          </button>
                          
                          {autoDraw && (
                            <div className="speed-controls">
                              <label>Speed:</label>
                              <div className="speed-buttons">
                                <button
                                  className={`speed-btn ${drawSpeed === 500 ? 'active' : ''}`}
                                  onClick={() => setDrawSpeed(500)}
                                  disabled={!autoDraw}
                                >
                                  Fast
                                </button>
                                <button
                                  className={`speed-btn ${drawSpeed === 1000 ? 'active' : ''}`}
                                  onClick={() => setDrawSpeed(1000)}
                                  disabled={!autoDraw}
                                >
                                  Medium
                                </button>
                                <button
                                  className={`speed-btn ${drawSpeed === 2000 ? 'active' : ''}`}
                                  onClick={() => setDrawSpeed(2000)}
                                  disabled={!autoDraw}
                                >
                                  Slow
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {!autoDraw && (
                          <p className="draw-instruction">Click to draw the next number!</p>
                        )}
                        {autoDraw && (
                          <p className="draw-instruction auto-draw-active">
                            ⚡ Auto-drawing numbers every {drawSpeed / 1000}s...
                          </p>
                        )}
                      </div>
                    ) : !result ? (
                      <div className="draw-button-container">
                        <button 
                          onClick={() => setGameActive(true)} 
                          className="btn btn-primary btn-draw-number"
                        >
                          <span className="draw-icon">🎲</span> Start Drawing Numbers
                        </button>
                        <p className="draw-instruction">Click to start drawing numbers!</p>
                      </div>
                    ) : null}

                    {result && (
                      <div className={`result ${result.win ? 'win' : 'lose'}`}>
                        <div className="result-icon-large">
                          {result.win ? '🎉' : '😔'}
                        </div>
                        <h2>{result.message}</h2>
                        {result.win && result.amount > 0 ? (
                          <p className="win-amount">You won ${result.amount}!</p>
                        ) : (
                          <p className="lose-message">Better luck next time!</p>
                        )}
                        {result.win && result.cardIndex !== undefined && (
                          <p className="winning-card-info">Winning Card: {result.cardIndex + 1}</p>
                        )}
                      </div>
                    )}

                    {!gameActive && bingoCards.length > 0 && (
                      <button
                        onClick={() => {
                          setAutoDraw(false);
                          if (autoDrawIntervalRef.current) {
                            clearInterval(autoDrawIntervalRef.current);
                            autoDrawIntervalRef.current = null;
                          }
                          setBingoCards([]);
                          setDrawnNumbers([]);
                          setSelectedNumbers([]);
                          setResult(null);
                          setShowConfetti(false);
                          fetchUser();
                        }}
                        className="btn btn-secondary"
                      >
                        New Game
                      </button>
                    )}
                    
                    <div className="draws-info">
                      <p>Numbers Drawn: {drawnNumbers.length} / {MAX_DRAWS}</p>
                      {drawnNumbers.length >= MAX_DRAWS && (
                        <p className="max-draws-reached">Maximum draws reached!</p>
                      )}
                    </div>
                  </div>

                  <div className="rules-section">
                    <h3>Game Rules</h3>
                    <div className="rules-content">
                      <div className="rules-objective">
                        <p><strong>Objective:</strong> Mark off numbers on your bingo card as they're drawn. Win by completing a row, column, or diagonal!</p>
                      </div>
                      
                      <div className="rules-tabs">
                        <div className="tab-panel">
                          <ul>
                            <li>Select bet amount and number of cards (1-4)</li>
                            <li>Click "Start Game" to begin</li>
                            <li>Numbers are drawn one at a time</li>
                            <li>Mark matching numbers on your card(s)</li>
                            <li>Win by completing a row, column, or diagonal</li>
                            <li>Use auto-draw for faster gameplay</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BingoGame;

