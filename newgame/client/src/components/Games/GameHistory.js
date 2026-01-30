import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import BackToDashboard from '../Navigation/BackToDashboard';
import './GameHistory.css';

function GameHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    game: '',
    result: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchGameHistory();
  }, [filters]);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams();
      
      if (filters.game) params.append('game', filters.game);
      if (filters.result) params.append('result', filters.result);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(
        `${API_URL}/games/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(response.data.history);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGameIcon = (gameName) => {
    const icons = {
      slots: '🎰',
      blackjack: '🃏',
      poker: '🂡',
      roulette: '🎲',
      bingo: '🎱',
      craps: '🎲',
      keno: '🎫',
      scratch: '🎟️',
      wheel: '🎡',
      texasholdem: '🃏',
      baccarat: '🂮',
      sicbo: '🎲',
      dragontiger: '🐉',
      bigsmall: '🎲',
      hilo: '🃏',
      lucky7: '🎲',
      diceduel: '🎲',
      numbermatch: '🔢',
      quickdraw: '🎯',
      numberwheel: '🎡',
      moneywheel: '💰',
      bigsix: '🎡',
      colorwheel: '🌈',
      coinflip: '🪙',
      classicSlots: '🎰',
      fruitslots: '🍒',
      diamondslots: '💎',
      progressiveslots: '🎰',
      multilineslots: '🎰'
    };
    return icons[gameName] || '🎮';
  };

  const getGameDisplayName = (gameName) => {
    return gameName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      game: '',
      result: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
  };

  const gameOptions = [
    { value: '', label: 'All Games' },
    { value: 'slots', label: 'Slots' },
    { value: 'blackjack', label: 'Blackjack' },
    { value: 'poker', label: 'Poker' },
    { value: 'roulette', label: 'Roulette' },
    { value: 'bingo', label: 'Bingo' },
    { value: 'craps', label: 'Craps' },
    { value: 'keno', label: 'Keno' },
    { value: 'scratch', label: 'Scratch Cards' },
    { value: 'wheel', label: 'Wheel' },
    { value: 'texasholdem', label: 'Texas Hold\'em' },
    { value: 'baccarat', label: 'Baccarat' },
    { value: 'sicbo', label: 'Sic Bo' },
    { value: 'dragontiger', label: 'Dragon Tiger' },
    { value: 'bigsmall', label: 'Big Small' },
    { value: 'hilo', label: 'Hi-Lo' },
    { value: 'lucky7', label: 'Lucky 7' },
    { value: 'diceduel', label: 'Dice Duel' },
    { value: 'numbermatch', label: 'Number Match' },
    { value: 'quickdraw', label: 'Quick Draw' },
    { value: 'numberwheel', label: 'Number Wheel' },
    { value: 'moneywheel', label: 'Money Wheel' },
    { value: 'bigsix', label: 'Big Six' },
    { value: 'colorwheel', label: 'Color Wheel' },
    { value: 'coinflip', label: 'Coin Flip' }
  ];

  return (
    <div className="game-history-container">
      <BackToDashboard />
      <div className="game-history-header">
        <h2>Game History</h2>
        <p className="subtitle">View your past game results and activity</p>
      </div>

      <div className="game-history-filters">
        <div className="filter-group">
          <label>Game</label>
          <select
            value={filters.game}
            onChange={(e) => handleFilterChange('game', e.target.value)}
            className="filter-select"
          >
            {gameOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Result</label>
          <select
            value={filters.result}
            onChange={(e) => handleFilterChange('result', e.target.value)}
            className="filter-select"
          >
            <option value="">All Results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
          />
        </div>

        <button onClick={clearFilters} className="clear-filters-btn">
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading game history...</div>
      ) : history.length === 0 ? (
        <div className="no-history">
          <div className="no-history-icon">📜</div>
          <h3>No game history found</h3>
          <p>Start playing games to see your history here!</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Go to Games
          </button>
        </div>
      ) : (
        <>
          <div className="game-history-list">
            {history.map((game) => (
              <div key={game.id} className={`game-history-item ${game.result}`}>
                <div className="game-icon">{getGameIcon(game.game)}</div>
                <div className="game-details">
                  <div className="game-header">
                    <h3>{getGameDisplayName(game.game)}</h3>
                    <span className={`result-badge ${game.result}`}>
                      {game.result === 'win' ? '🎉 Win' : '❌ Loss'}
                    </span>
                  </div>
                  <div className="game-meta">
                    <span className="game-date">{formatDate(game.timestamp)}</span>
                  </div>
                  {game.metadata && Object.keys(game.metadata).length > 0 && (
                    <div className="game-metadata">
                      {game.metadata.reels && (
                        <div className="metadata-item">
                          <span className="metadata-label">Reels:</span>
                          <span className="metadata-value">{game.metadata.reels.join(' ')}</span>
                        </div>
                      )}
                      {game.metadata.dice && (
                        <div className="metadata-item">
                          <span className="metadata-label">Dice:</span>
                          <span className="metadata-value">{game.metadata.dice.join(', ')}</span>
                        </div>
                      )}
                      {game.metadata.sum && (
                        <div className="metadata-item">
                          <span className="metadata-label">Sum:</span>
                          <span className="metadata-value">{game.metadata.sum}</span>
                        </div>
                      )}
                      {game.metadata.winningNumber !== undefined && (
                        <div className="metadata-item">
                          <span className="metadata-label">Number:</span>
                          <span className="metadata-value">{game.metadata.winningNumber}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="game-amounts">
                  <div className="amount-row">
                    <span className="amount-label">Bet:</span>
                    <span className="amount-value bet">-${game.bet.toFixed(2)}</span>
                  </div>
                  {game.win > 0 && (
                    <div className="amount-row">
                      <span className="amount-label">Win:</span>
                      <span className="amount-value win">+${game.win.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="amount-row net">
                    <span className="amount-label">Net:</span>
                    <span className={`amount-value ${game.net >= 0 ? 'positive' : 'negative'}`}>
                      {game.net >= 0 ? '+' : ''}${game.net.toFixed(2)}
                    </span>
                  </div>
                  <div className="balance-after">
                    Balance: ${game.balanceAfter.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total games)
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= pagination.totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GameHistory;

