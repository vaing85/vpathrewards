import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import BackToDashboard from '../Navigation/BackToDashboard';
import './Leaderboard.css';

function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('winnings');
  const [period, setPeriod] = useState('alltime');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchLeaderboard();
  }, [category, period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await axios.get(
        `${API_URL}/leaderboard?category=${category}&period=${period}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getCategoryLabel = () => {
    const labels = {
      winnings: 'Total Winnings',
      biggestWin: 'Biggest Win',
      mostActive: 'Most Active',
      totalBets: 'Total Bets'
    };
    return labels[category] || category;
  };

  const getPeriodLabel = () => {
    const labels = {
      daily: 'Today',
      weekly: 'This Week',
      alltime: 'All Time'
    };
    return labels[period] || period;
  };

  const getValueLabel = () => {
    const labels = {
      winnings: 'Total Winnings',
      biggestWin: 'Biggest Win',
      mostActive: 'Games Played',
      totalBets: 'Total Bets'
    };
    return labels[category] || 'Value';
  };

  const isCurrentUser = (entry) => {
    return user && (entry.email === user.email || entry.username === user.username);
  };

  return (
    <div className="leaderboard-container">
      <BackToDashboard />
      <div className="leaderboard-header">
        <h2>🏆 Leaderboard</h2>
        <p className="subtitle">Compete with players and climb the ranks!</p>
      </div>

      <div className="leaderboard-controls">
        <div className="control-group">
          <label>Category</label>
          <div className="category-tabs">
            <button
              className={`category-tab ${category === 'winnings' ? 'active' : ''}`}
              onClick={() => setCategory('winnings')}
            >
              💰 Total Winnings
            </button>
            <button
              className={`category-tab ${category === 'biggestWin' ? 'active' : ''}`}
              onClick={() => setCategory('biggestWin')}
            >
              ⭐ Biggest Win
            </button>
            <button
              className={`category-tab ${category === 'mostActive' ? 'active' : ''}`}
              onClick={() => setCategory('mostActive')}
            >
              🎮 Most Active
            </button>
            <button
              className={`category-tab ${category === 'totalBets' ? 'active' : ''}`}
              onClick={() => setCategory('totalBets')}
            >
              🎲 Total Bets
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Time Period</label>
          <div className="period-tabs">
            <button
              className={`period-tab ${period === 'daily' ? 'active' : ''}`}
              onClick={() => setPeriod('daily')}
            >
              Today
            </button>
            <button
              className={`period-tab ${period === 'weekly' ? 'active' : ''}`}
              onClick={() => setPeriod('weekly')}
            >
              This Week
            </button>
            <button
              className={`period-tab ${period === 'alltime' ? 'active' : ''}`}
              onClick={() => setPeriod('alltime')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      <div className="leaderboard-content">
        {loading ? (
          <div className="loading">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="no-leaderboard">
            <div className="no-leaderboard-icon">📊</div>
            <h3>No Rankings Yet</h3>
            <p>Be the first to play and claim the top spot!</p>
          </div>
        ) : (
          <>
            <div className="leaderboard-info">
              <h3>{getCategoryLabel()} - {getPeriodLabel()}</h3>
              <p>Showing top {leaderboard.length} players</p>
            </div>

            <div className="leaderboard-list">
              {leaderboard.map((entry, index) => {
                const rankIcon = getRankIcon(entry.rank);
                const isUser = isCurrentUser(entry);
                
                return (
                  <div
                    key={`${entry.username}-${entry.rank}`}
                    className={`leaderboard-item ${isUser ? 'current-user' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`}
                  >
                    <div className="rank-section">
                      {rankIcon ? (
                        <span className="rank-icon">{rankIcon}</span>
                      ) : (
                        <span className="rank-number">#{entry.rank}</span>
                      )}
                    </div>

                    <div className="player-section">
                      <div className="player-info">
                        <h4 className="player-name">
                          {entry.username}
                          {isUser && <span className="you-badge">You</span>}
                        </h4>
                        <p className="player-email">{entry.email}</p>
                      </div>
                    </div>

                    <div className="stats-section">
                      <div className="stat-item">
                        <span className="stat-label">{getValueLabel()}:</span>
                        <span className="stat-value">
                          {category === 'mostActive' 
                            ? formatNumber(entry.value)
                            : formatCurrency(entry.value)
                          }
                        </span>
                      </div>
                      {category === 'biggestWin' && entry.game && (
                        <div className="stat-item">
                          <span className="stat-label">Game:</span>
                          <span className="stat-value">{entry.game}</span>
                        </div>
                      )}
                      {category === 'biggestWin' && entry.winDate && (
                        <div className="stat-item">
                          <span className="stat-label">Date:</span>
                          <span className="stat-value">
                            {new Date(entry.winDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {category !== 'biggestWin' && (
                        <>
                          {entry.totalBets !== undefined && (
                            <div className="stat-item">
                              <span className="stat-label">Total Bets:</span>
                              <span className="stat-value">{formatCurrency(entry.totalBets)}</span>
                            </div>
                          )}
                          {entry.totalWinnings !== undefined && category === 'totalBets' && (
                            <div className="stat-item">
                              <span className="stat-label">Total Winnings:</span>
                              <span className="stat-value">{formatCurrency(entry.totalWinnings)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {entry.balance !== undefined && (
                      <div className="balance-section">
                        <span className="balance-label">Balance</span>
                        <span className="balance-value">{formatCurrency(entry.balance)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;

