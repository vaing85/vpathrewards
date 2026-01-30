import React, { useEffect, useState, useRef } from 'react';
import './ResultOverlay.css';

/**
 * Reusable result overlay component with auto-dismiss timer
 * @param {object} result - Result object with { win, message, amount } or { won, message, amount }
 * @param {boolean} show - Whether to show the overlay
 * @param {function} onClose - Function to call when overlay closes
 * @param {number} autoCloseDelay - Auto-close delay in seconds (default: 5)
 * @param {boolean} showTimer - Whether to show countdown timer (default: true)
 */
const ResultOverlay = ({ 
  result, 
  show, 
  onClose, 
  autoCloseDelay = 5,
  showTimer = true 
}) => {
  const [timer, setTimer] = useState(autoCloseDelay);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);
  const closeButtonRef = useRef(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match CSS transition duration
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('result-overlay')) {
      handleClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Timer effect
  useEffect(() => {
    if (show && result) {
      setTimer(autoCloseDelay);
      setIsClosing(false);
      
      if (autoCloseDelay > 0) {
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleClose();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [show, result, autoCloseDelay]);

  // Focus management - focus close button when overlay opens
  useEffect(() => {
    if (show && result && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [show, result]);

  if (!show || !result) return null;

  // Support both 'win' and 'won' properties
  const isWin = result.win === true || result.won === true;
  const isLose = result.win === false || result.won === false;
  const resultType = isWin ? 'win' : isLose ? 'lose' : 'tie';
  
  // Screen reader announcement
  const announcement = isWin 
    ? `You won ${result.amount ? `$${Math.abs(result.amount).toFixed(2)}` : ''}! ${result.message || ''}`
    : isLose 
    ? `You lost ${result.amount ? `$${Math.abs(result.amount).toFixed(2)}` : ''}. ${result.message || 'Better luck next time!'}`
    : `Tie game. ${result.message || ''}`;

  return (
    <>
      {/* Screen reader announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      <div 
        className={`result-overlay ${resultType} ${isClosing ? 'closing' : ''}`}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-message"
      >
        <div className={`result-popup ${resultType} ${isClosing ? 'closing' : ''}`}>
          <button 
            ref={closeButtonRef}
            className="result-close-btn"
            onClick={handleClose}
            aria-label="Close result dialog"
            type="button"
          >
            ×
          </button>
        
        {showTimer && timer > 0 && (
          <div className="result-timer">
            <span className="timer-countdown">{timer}s</span>
          </div>
        )}

        <div className="result-icon">
          {isWin && <span className="win-icon">🎉</span>}
          {isLose && <span className="lose-icon">😔</span>}
          {!isWin && !isLose && <span className="tie-icon">🤝</span>}
        </div>

        <div className="result-content">
          <h2 id="result-title" className={`result-title ${resultType}`}>
            {isWin ? 'You Win!' : isLose ? 'You Lose' : 'Tie Game'}
          </h2>
          
          {result.message && (
            <p id="result-message" className="result-message">{result.message}</p>
          )}

          {result.amount !== undefined && (
            <div 
              className={`result-amount ${resultType}`}
              aria-label={isWin ? `You won $${Math.abs(result.amount).toFixed(2)}` : `You lost $${Math.abs(result.amount).toFixed(2)}`}
            >
              {isWin ? '+' : '-'}${Math.abs(result.amount).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ResultOverlay;

