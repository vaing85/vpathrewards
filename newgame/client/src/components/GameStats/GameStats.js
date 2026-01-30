import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import LoadingSpinner from '../Loading/LoadingSpinner';
import { CardSkeleton } from '../Loading/SkeletonLoader';
import BackToDashboard from '../Navigation/BackToDashboard';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './GameStats.css';

/**
 * Game Statistics Component
 * 
 * Displays player statistics including:
 * - Games played per game
 * - Win/loss ratios
 * - Total winnings/losses
 * - Favorite games
 * - Best wins
 */
function GameStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [gameHistory, setGameHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', '7d', '30d', '90d'
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Fetching stats...', { API_URL, timePeriod });
      
      // Fetch user stats and game history with timeout
      const timeout = 10000; // 10 seconds timeout
      const userPromise = axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      });
      
      const historyPromise = axios.get(`${API_URL}/games/history?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout
      });

      const [userResponse, historyResponse] = await Promise.all([userPromise, historyPromise]);

      console.log('API responses received:', {
        userData: userResponse.data ? 'OK' : 'MISSING',
        historyCount: historyResponse.data?.history?.length || 0
      });

      const userData = userResponse.data;
      const history = historyResponse.data?.history || [];

      // Calculate statistics
      const gameStats = calculateGameStats(userData, history, timePeriod);
      
      console.log('Stats calculated:', {
        overall: gameStats.overall,
        byGameCount: gameStats.byGame.length,
        chartsData: gameStats.charts ? 'Present' : 'Missing'
      });
      
      setStats(gameStats);
      setGameHistory(history);
    } catch (err) {
      console.error('Error fetching stats:', err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || 'Failed to load statistics. Please try again.';
      setError(errorMessage);
      
      // Set empty stats so page can still render
      setStats({
        overall: {
          totalGames: 0,
          totalWinnings: 0,
          totalBets: 0,
          netResult: 0,
          favoriteGame: 'None',
          gamesWithStats: 0
        },
        byGame: [],
        charts: {
          winLossTrend: [],
          gamePerformance: [],
          earningsData: [],
          winRateDistribution: []
        }
      });
    } finally {
      setLoading(false);
    }
  }, [timePeriod, API_URL]);

  useEffect(() => {
    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user, fetchStats]);

  const calculateGameStats = (userData, history, period = 'all') => {
    const gamesPlayed = userData.gamesPlayed || {};
    
    // Filter history by time period
    let filteredHistory = history;
    if (period !== 'all') {
      const now = new Date();
      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
      filteredHistory = history.filter(game => new Date(game.timestamp || game.createdAt) >= cutoffDate);
    }
    
    const totalGames = Object.values(gamesPlayed).reduce((sum, count) => sum + count, 0);
    
    // Group history by game
    const gameHistoryMap = {};
    filteredHistory.forEach(game => {
      if (!gameHistoryMap[game.game]) {
        gameHistoryMap[game.game] = { wins: 0, losses: 0, totalBet: 0, totalWin: 0, bestWin: 0 };
      }
      
      if (game.result === 'win') {
        gameHistoryMap[game.game].wins++;
        gameHistoryMap[game.game].totalWin += game.win;
        if (game.win > gameHistoryMap[game.game].bestWin) {
          gameHistoryMap[game.game].bestWin = game.win;
        }
      } else {
        gameHistoryMap[game.game].losses++;
      }
      gameHistoryMap[game.game].totalBet += game.bet;
    });

    // Calculate win rates
    const gameStatsArray = Object.entries(gamesPlayed)
      .filter(([_, count]) => count > 0)
      .map(([gameName, count]) => {
        const history = gameHistoryMap[gameName] || { wins: 0, losses: 0, totalBet: 0, totalWin: 0, bestWin: 0 };
        const totalGames = history.wins + history.losses;
        const winRate = totalGames > 0 ? (history.wins / totalGames * 100).toFixed(1) : 0;
        const netResult = history.totalWin - history.totalBet;
        
        return {
          gameName: formatGameName(gameName),
          gamesPlayed: count,
          wins: history.wins,
          losses: history.losses,
          winRate: parseFloat(winRate),
          totalBet: history.totalBet,
          totalWin: history.totalWin,
          netResult: netResult,
          bestWin: history.bestWin
        };
      })
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    // Find favorite game
    const favoriteGame = gameStatsArray.length > 0 ? gameStatsArray[0] : null;

    // Calculate overall stats
    const overallStats = {
      totalGames,
      totalWinnings: userData.totalWinnings || 0,
      totalBets: userData.totalBets || 0,
      netResult: (userData.totalWinnings || 0) - (userData.totalBets || 0),
      favoriteGame: favoriteGame?.gameName || 'None',
      gamesWithStats: gameStatsArray.length
    };

    // Prepare chart data
    const chartData = prepareChartData(filteredHistory, gameStatsArray);

    return {
      overall: overallStats,
      byGame: gameStatsArray,
      charts: chartData
    };
  };

  const prepareChartData = (history, gameStats) => {
    // Win/Loss Trend (by date)
    const trendData = {};
    history.forEach(game => {
      if (!game || (!game.timestamp && !game.createdAt)) return;
      
      const gameDate = new Date(game.timestamp || game.createdAt);
      if (isNaN(gameDate.getTime())) return; // Invalid date
      
      const dateKey = gameDate.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
      const dateLabel = gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!trendData[dateKey]) {
        trendData[dateKey] = { date: dateLabel, dateKey, wins: 0, losses: 0, net: 0 };
      }
      
      if (game.result === 'win') {
        trendData[dateKey].wins++;
        trendData[dateKey].net += (game.win || 0) - (game.bet || 0);
      } else {
        trendData[dateKey].losses++;
        trendData[dateKey].net -= (game.bet || 0);
      }
    });
    const winLossTrend = Object.values(trendData)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map(({ dateKey, ...rest }) => rest); // Remove dateKey from final data
    
    // If no trend data, create at least one point to show empty state
    if (winLossTrend.length === 0 && history.length > 0) {
      const firstDate = new Date(history[0]?.timestamp || history[0]?.createdAt || Date.now());
      winLossTrend.push({
        date: firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        wins: 0,
        losses: 0,
        net: 0
      });
    }

    // Game Performance Comparison (top 10 games)
    const gamePerformance = gameStats
      .filter(game => game && (game.wins > 0 || game.losses > 0))
      .slice(0, 10)
      .map(game => ({
        name: game.gameName && game.gameName.length > 12 ? game.gameName.substring(0, 12) + '...' : (game.gameName || 'Unknown'),
        fullName: game.gameName || 'Unknown',
        wins: game.wins || 0,
        losses: game.losses || 0,
        netResult: game.netResult || 0
      }));

    // Earnings vs Spending (cumulative)
    const earningsData = [];
    let cumulativeEarnings = 0;
    let cumulativeSpending = 0;
    
    const sortedHistory = history
      .filter(game => game && (game.timestamp || game.createdAt))
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt);
        const dateB = new Date(b.timestamp || b.createdAt);
        return dateA - dateB;
      });
    
    if (sortedHistory.length === 0) {
      // Return at least one point for empty state
      earningsData.push({
        game: 1,
        earnings: 0,
        spending: 0,
        net: 0
      });
    } else {
      sortedHistory.forEach((game, index) => {
        const bet = game.bet || 0;
        const win = game.win || 0;
        
        if (game.result === 'win') {
          cumulativeEarnings += win;
          cumulativeSpending += bet;
        } else {
          cumulativeSpending += bet;
        }
        
        // Sample data points (max 20 points for smooth chart)
        const sampleRate = Math.max(1, Math.floor(sortedHistory.length / 20));
        if (index % sampleRate === 0 || index === sortedHistory.length - 1) {
          earningsData.push({
            game: index + 1,
            earnings: cumulativeEarnings,
            spending: cumulativeSpending,
            net: cumulativeEarnings - cumulativeSpending
          });
        }
      });
    }

    // Win Rate Distribution (pie chart data)
    const winRateDistribution = gameStats
      .filter(game => game && (game.wins || 0) + (game.losses || 0) > 0 && game.winRate !== undefined)
      .map(game => ({
        name: game.gameName && game.gameName.length > 15 ? game.gameName.substring(0, 15) + '...' : (game.gameName || 'Unknown'),
        fullName: game.gameName || 'Unknown',
        value: game.winRate || 0,
        games: game.gamesPlayed || 0
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 8); // Top 8 games for pie chart

    // Ensure we have at least some data for charts
    const result = {
      winLossTrend: winLossTrend.length > 0 ? winLossTrend : [],
      gamePerformance: gamePerformance.length > 0 ? gamePerformance : [],
      earningsData: earningsData.length > 0 ? earningsData : [],
      winRateDistribution: winRateDistribution.length > 0 ? winRateDistribution : []
    };

    // Debug logging (can be removed in production)
    console.log('Chart data prepared:', {
      winLossTrendCount: result.winLossTrend.length,
      gamePerformanceCount: result.gamePerformance.length,
      earningsDataCount: result.earningsData.length,
      winRateDistributionCount: result.winRateDistribution.length,
      sampleWinLoss: result.winLossTrend.slice(0, 3),
      sampleGamePerf: result.gamePerformance.slice(0, 3)
    });

    return result;
  };

  const formatGameName = (gameName) => {
    return gameName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/slots/i, 'Slots')
      .replace(/poker/i, 'Poker')
      .replace(/blackjack/i, 'Blackjack')
      .trim();
  };

  if (loading) {
    return (
      <div className="game-stats-container">
        <BackToDashboard />
        <div className="game-stats-loading">
          <LoadingSpinner size="large" text="Loading statistics..." />
          <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-stats-container">
        <BackToDashboard />
        <div className="game-stats-error">
          <p>Error loading statistics: {error}</p>
          <button onClick={fetchStats} className="btn btn-primary">Retry</button>
          <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Check the browser console (F12) for more details.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];

  return (
    <div className="game-stats-container">
      <BackToDashboard />
      <div className="game-stats-header">
        <h2 className="game-stats-title">📊 Your Game Statistics</h2>
        <div className="time-period-filter">
          <label>Time Period:</label>
          <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="period-select">
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>
      
      {/* Overall Stats */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-label">Total Games</div>
            <div className="stat-value">{stats.overall.totalGames.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Winnings</div>
            <div className="stat-value positive">${stats.overall.totalWinnings.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💸</div>
          <div className="stat-content">
            <div className="stat-label">Total Bets</div>
            <div className="stat-value">${stats.overall.totalBets.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">{stats.overall.netResult >= 0 ? '📈' : '📉'}</div>
          <div className="stat-content">
            <div className="stat-label">Net Result</div>
            <div className={`stat-value ${stats.overall.netResult >= 0 ? 'positive' : 'negative'}`}>
              ${stats.overall.netResult >= 0 ? '+' : ''}{stats.overall.netResult.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-label">Favorite Game</div>
            <div className="stat-value">{stats.overall.favoriteGame}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {stats.charts && stats.byGame.length > 0 && (
        <div className="charts-section">
          {/* Win/Loss Trend Chart */}
          {stats.charts.winLossTrend.length > 0 && (
            <div className="chart-card">
              <h3>📈 Win/Loss Trend</h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.charts.winLossTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="wins" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Wins"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="losses" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Losses"
                    dot={{ r: 4 }}
                  />
                </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Game Performance Comparison */}
          {stats.charts.gamePerformance && stats.charts.gamePerformance.length > 0 && (
            <div className="chart-card">
              <h3>🎮 Game Performance Comparison</h3>
              <div style={{ width: '100%', height: '350px', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.charts.gamePerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    type="number"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value, name) => {
                      if (name === 'netResult') {
                        return [`$${value.toFixed(2)}`, 'Net Result'];
                      }
                      return [value, name === 'wins' ? 'Wins' : 'Losses'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="wins" fill="#10b981" name="Wins" />
                  <Bar dataKey="losses" fill="#ef4444" name="Losses" />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Earnings vs Spending */}
          {stats.charts.earningsData && stats.charts.earningsData.length > 0 && (
            <div className="chart-card">
              <h3>💰 Earnings vs Spending</h3>
              <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.charts.earningsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis 
                    dataKey="game"
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Game #', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorEarnings)"
                    name="Earnings"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spending" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorSpending)"
                    name="Spending"
                  />
                </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Win Rate Distribution */}
          {stats.charts.winRateDistribution && stats.charts.winRateDistribution.length > 0 && (
            <div className="chart-card">
              <h3>🎯 Win Rate Distribution</h3>
              <div style={{ width: '100%', height: '350px', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={stats.charts.winRateDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, games }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.charts.winRateDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value, name, props) => [
                      `${value.toFixed(1)}% (${props.payload.games} games)`,
                      props.payload.fullName
                    ]}
                  />
                </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game-by-Game Stats */}
      {stats.byGame.length > 0 && (
        <div className="game-stats-table">
          <h3>Game Performance</h3>
          <div className="stats-table">
            <div className="stats-table-header">
              <div>Game</div>
              <div>Played</div>
              <div>Win Rate</div>
              <div>Wins</div>
              <div>Losses</div>
              <div>Net Result</div>
              <div>Best Win</div>
            </div>
            {stats.byGame.map((game, index) => (
              <div key={index} className="stats-table-row">
                <div className="game-name">{game.gameName}</div>
                <div>{game.gamesPlayed}</div>
                <div>
                  <span className={`win-rate ${game.winRate >= 50 ? 'good' : game.winRate >= 30 ? 'medium' : 'low'}`}>
                    {game.winRate}%
                  </span>
                </div>
                <div className="wins">{game.wins}</div>
                <div className="losses">{game.losses}</div>
                <div className={game.netResult >= 0 ? 'positive' : 'negative'}>
                  ${game.netResult >= 0 ? '+' : ''}{game.netResult.toFixed(2)}
                </div>
                <div className="best-win">
                  {game.bestWin > 0 ? `$${game.bestWin.toFixed(2)}` : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.byGame.length === 0 && (
        <div className="game-stats-empty">
          <p>No game statistics yet. Start playing games to see your stats!</p>
        </div>
      )}

      {stats.charts && stats.charts.winLossTrend.length === 0 && stats.byGame.length > 0 && (
        <div className="game-stats-empty">
          <p>Not enough data for charts in the selected time period. Try selecting "All Time" or play more games!</p>
        </div>
      )}
    </div>
  );
}

export default GameStats;

