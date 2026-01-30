import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAuthToken } from '../../utils/authToken';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './Analytics.css';

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    period: 'daily',
    startDate: '',
    endDate: ''
  });
  const [revenueData, setRevenueData] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const revenueChartContainerRef = useRef(null);
  const gameChart1Ref = useRef(null);
  const gameChart2Ref = useRef(null);
  const activityChartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [gameChart1Width, setGameChart1Width] = useState(600);
  const [gameChart2Width, setGameChart2Width] = useState(600);
  const [activityChartWidth, setActivityChartWidth] = useState(800);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAllAnalytics();
  }, [filters]);

  useEffect(() => {
    const updateChartWidth = () => {
      if (revenueChartContainerRef && revenueChartContainerRef.current) {
        const width = revenueChartContainerRef.current.offsetWidth;
        if (width > 0 && width !== chartWidth) {
          setChartWidth(width);
        }
      }
    };

    // Use multiple attempts to ensure the ref is attached and measured
    const timer1 = setTimeout(updateChartWidth, 50);
    const timer2 = setTimeout(updateChartWidth, 200);
    const timer3 = setTimeout(updateChartWidth, 500);
    window.addEventListener('resize', updateChartWidth);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updateChartWidth);
    };
  }, [revenueData, chartWidth]);

  useEffect(() => {
    const updateGameChartWidths = () => {
      if (gameChart1Ref.current) {
        const width = gameChart1Ref.current.offsetWidth;
        if (width > 0 && width !== gameChart1Width) {
          setGameChart1Width(width);
        }
      }
      if (gameChart2Ref.current) {
        const width = gameChart2Ref.current.offsetWidth;
        if (width > 0 && width !== gameChart2Width) {
          setGameChart2Width(width);
        }
      }
    };

    const timer1 = setTimeout(updateGameChartWidths, 50);
    const timer2 = setTimeout(updateGameChartWidths, 200);
    const timer3 = setTimeout(updateGameChartWidths, 500);
    window.addEventListener('resize', updateGameChartWidths);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updateGameChartWidths);
    };
  }, [gameStats, gameChart1Width, gameChart2Width]);

  useEffect(() => {
    const updateActivityChartWidth = () => {
      if (activityChartRef.current) {
        const width = activityChartRef.current.offsetWidth;
        if (width > 0 && width !== activityChartWidth) {
          setActivityChartWidth(width);
        }
      }
    };

    const timer1 = setTimeout(updateActivityChartWidth, 50);
    const timer2 = setTimeout(updateActivityChartWidth, 200);
    const timer3 = setTimeout(updateActivityChartWidth, 500);
    window.addEventListener('resize', updateActivityChartWidth);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updateActivityChartWidth);
    };
  }, [activityData, activityChartWidth]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const [revenueRes, gameRes, activityRes, financialRes] = await Promise.all([
        axios.get(
          `${API_URL}/admin/analytics/revenue?period=${filters.period}${filters.startDate ? `&startDate=${filters.startDate}` : ''}${filters.endDate ? `&endDate=${filters.endDate}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_URL}/admin/analytics/game-popularity?limit=10${filters.startDate ? `&startDate=${filters.startDate}` : ''}${filters.endDate ? `&endDate=${filters.endDate}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_URL}/admin/analytics/user-activity?period=${filters.period}${filters.startDate ? `&startDate=${filters.startDate}` : ''}${filters.endDate ? `&endDate=${filters.endDate}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_URL}/admin/analytics/financial-summary${filters.startDate ? `?startDate=${filters.startDate}` : ''}${filters.endDate ? `${filters.startDate ? '&' : '?'}endDate=${filters.endDate}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      const revenueData = revenueRes.data.revenueData || revenueRes.data || [];
      const gameStats = gameRes.data.gameStats || gameRes.data || [];
      const activityData = activityRes.data.activityData || activityRes.data || [];
      
      console.log('Revenue Response:', revenueRes.data);
      console.log('Revenue Data:', revenueData);
      console.log('Revenue Data Length:', revenueData.length);
      if (revenueData.length > 0) {
        console.log('First Revenue Item:', revenueData[0]);
        console.log('Sample data keys:', Object.keys(revenueData[0]));
      }
      
      console.log('Game Stats:', gameStats);
      console.log('Game Stats Length:', gameStats.length);
      if (gameStats.length > 0) {
        console.log('First Game Stat:', gameStats[0]);
      }
      
      setRevenueData(revenueData);
      setGameStats(gameStats);
      setActivityData(activityData);
      setFinancialSummary(financialRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('W')) {
      return dateStr;
    }
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateStr.split('-');
      return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getGameDisplayName = (gameName) => {
    if (!gameName) return '';
    return gameName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Advanced Analytics</h2>
        <div className="analytics-filters">
          <div className="filter-group">
            <label>Period</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="filter-select"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="filter-input"
            />
          </div>
          <button
            onClick={() => setFilters({ period: 'daily', startDate: '', endDate: '' })}
            className="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      {financialSummary && (
        <div className="financial-summary">
          <div className="summary-card">
            <div className="summary-label">Total Deposits</div>
            <div className="summary-value positive">{formatCurrency(financialSummary.deposits?.total)}</div>
            <div className="summary-count">{financialSummary.deposits?.count || 0} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Withdrawals</div>
            <div className="summary-value negative">{formatCurrency(financialSummary.withdrawals?.total)}</div>
            <div className="summary-count">{financialSummary.withdrawals?.count || 0} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Bets</div>
            <div className="summary-value">{formatCurrency(financialSummary.bets?.total)}</div>
            <div className="summary-count">{financialSummary.bets?.count || 0} bets</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Wins</div>
            <div className="summary-value negative">{formatCurrency(financialSummary.wins?.total)}</div>
            <div className="summary-count">{financialSummary.wins?.count || 0} wins</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Net Revenue</div>
            <div className={`summary-value ${(financialSummary.netRevenue || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(financialSummary.netRevenue)}
            </div>
            <div className="summary-count">Profit Margin: {financialSummary.profitMargin || 0}%</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Bonuses</div>
            <div className="summary-value negative">{formatCurrency(financialSummary.bonuses?.total)}</div>
            <div className="summary-count">{financialSummary.bonuses?.count || 0} bonuses</div>
          </div>
        </div>
      )}

      {/* Revenue Trends Chart */}
      <div className="chart-section card">
        <h3>Revenue Trends</h3>
        {revenueData && revenueData.length > 0 ? (
          <div 
            ref={revenueChartContainerRef}
            className="chart-container-large" 
            style={{ width: '100%', height: '750px', minWidth: 600, display: 'block', position: 'relative' }}
          >
            <ResponsiveContainer width={chartWidth > 600 ? chartWidth : 1200} height={750} minWidth={600}>
              <LineChart 
                data={revenueData} 
                margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="#666"
                  tick={{ fill: '#333' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                  stroke="#666"
                  tick={{ fill: '#333', fontSize: 12 }}
                  width={60}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${formatDate(label)}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: '600', marginBottom: '5px' }}
                />
                <Legend wrapperStyle={{ color: '#333' }} />
                <Line 
                  type="monotone" 
                  dataKey="bets" 
                  stroke="#667eea" 
                  strokeWidth={3} 
                  name="Bets" 
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="wins" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  name="Wins" 
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4ade80" 
                  strokeWidth={3} 
                  name="Revenue" 
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-content">
              <div className="no-data-icon">📊</div>
              <div className="no-data-title">No revenue data available</div>
              <div className="no-data-subtitle">for the selected period</div>
              <div className="no-data-hint">Try adjusting the date range or period filter</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Popularity */}
      <div className="chart-section card">
        <h3>Game Popularity (Top 10)</h3>
        {gameStats.length > 0 ? (
          <div className="charts-row">
            <div className="chart-container">
              <h4>Total Bets by Game</h4>
              <div ref={gameChart1Ref} className="chart-container-medium" style={{ width: '100%', height: '500px', minWidth: 0, flex: '1 1 auto' }}>
                <ResponsiveContainer width={gameChart1Width > 600 ? gameChart1Width : 600} height={500} minWidth={600}>
                  <BarChart data={gameStats} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                    <XAxis 
                      dataKey="game" 
                      tickFormatter={getGameDisplayName}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      stroke="#666"
                      tick={{ fill: '#333', fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      stroke="#666"
                      tick={{ fill: '#333', fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: '600', marginBottom: '5px' }}
                    />
                    <Legend wrapperStyle={{ color: '#333' }} />
                    <Bar dataKey="totalBets" fill="#667eea" name="Total Bets" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="chart-container">
              <h4>Revenue by Game</h4>
              <div ref={gameChart2Ref} className="chart-container-medium" style={{ width: '100%', height: '500px', minWidth: 0, flex: '1 1 auto' }}>
                <ResponsiveContainer width={gameChart2Width > 600 ? gameChart2Width : 600} height={500} minWidth={600}>
                  <BarChart data={gameStats} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                    <XAxis 
                      dataKey="game" 
                      tickFormatter={getGameDisplayName}
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      stroke="#666"
                      tick={{ fill: '#333', fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                      stroke="#666"
                      tick={{ fill: '#333', fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: '600', marginBottom: '5px' }}
                    />
                    <Legend wrapperStyle={{ color: '#333' }} />
                    <Bar dataKey="revenue" fill="#4ade80" name="Revenue" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-content">
              <div className="no-data-icon">🎮</div>
              <div className="no-data-title">No game data available</div>
              <div className="no-data-hint">Try adjusting the date range filter</div>
            </div>
          </div>
        )}
      </div>

      {/* User Activity Chart */}
      <div className="chart-section card">
        <h3>User Activity</h3>
        {activityData.length > 0 ? (
          <div ref={activityChartRef} className="chart-container-medium" style={{ width: '100%', height: '450px', minWidth: 0 }}>
            <ResponsiveContainer width={activityChartWidth > 600 ? activityChartWidth : 800} height={450} minWidth={600}>
              <LineChart data={activityData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    stroke="#666"
                    tick={{ fill: '#333', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#666" 
                    tick={{ fill: '#333', fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip 
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#fff',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: '600', marginBottom: '5px' }}
                  />
                  <Legend wrapperStyle={{ color: '#333' }} />
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="#667eea" 
                    strokeWidth={3} 
                    name="New Registrations" 
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="activeUsers" 
                    stroke="#4ade80" 
                    strokeWidth={3} 
                    name="Active Users" 
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-content">
              <div className="no-data-icon">👥</div>
              <div className="no-data-title">No activity data available</div>
              <div className="no-data-subtitle">for the selected period</div>
              <div className="no-data-hint">Try adjusting the date range or period filter</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Stats Table */}
      {gameStats.length > 0 && (
        <div className="chart-section card">
          <h3>Detailed Game Statistics</h3>
          <div className="game-stats-table">
            <table>
              <thead>
                <tr>
                  <th>🎮 Game</th>
                  <th>💰 Total Bets</th>
                  <th>🎁 Total Wins</th>
                  <th>📊 Revenue</th>
                  <th>🎯 Bet Count</th>
                  <th>👥 Unique Players</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((game, index) => (
                  <tr key={index}>
                    <td>{getGameDisplayName(game.game)}</td>
                    <td>{formatCurrency(game.totalBets)}</td>
                    <td>{formatCurrency(game.totalWins)}</td>
                    <td className={(game.revenue || 0) >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(game.revenue)}
                    </td>
                    <td>{(game.betCount || 0).toLocaleString()}</td>
                    <td>{game.uniquePlayers || 0}</td>
                  </tr>
                ))}
                {/* Totals Row */}
                {gameStats.length > 0 && (() => {
                  const totals = gameStats.reduce((acc, game) => ({
                    totalBets: acc.totalBets + (game.totalBets || 0),
                    totalWins: acc.totalWins + (game.totalWins || 0),
                    revenue: acc.revenue + (game.revenue || 0),
                    betCount: acc.betCount + (game.betCount || 0),
                    uniquePlayers: acc.uniquePlayers + (game.uniquePlayers || 0)
                  }), { totalBets: 0, totalWins: 0, revenue: 0, betCount: 0, uniquePlayers: 0 });
                  
                  return (
                    <tr className="totals-row">
                      <td><strong>📈 Total</strong></td>
                      <td><strong>{formatCurrency(totals.totalBets)}</strong></td>
                      <td><strong>{formatCurrency(totals.totalWins)}</strong></td>
                      <td className={(totals.revenue || 0) >= 0 ? 'positive' : 'negative'}>
                        <strong>{formatCurrency(totals.revenue)}</strong>
                      </td>
                      <td><strong>{totals.betCount.toLocaleString()}</strong></td>
                      <td><strong>{totals.uniquePlayers.toLocaleString()}</strong></td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
