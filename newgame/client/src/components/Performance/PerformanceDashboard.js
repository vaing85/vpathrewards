import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getAuthToken } from '../../utils/authToken';
import LoadingSpinner from '../Loading/LoadingSpinner';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './PerformanceDashboard.css';

function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [apiStats, setApiStats] = useState(null);
  const [webVitals, setWebVitals] = useState(null);
  const [cachedMetrics, setCachedMetrics] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        console.warn('No auth token available for performance data');
        setLoading(false);
        return;
      }

      const [apiStatsRes, webVitalsRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/performance/api-stats?range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          if (err.response?.status === 429) {
            console.warn('Rate limited: API stats. Will retry later.');
          } else {
            console.warn('Error fetching API stats:', err);
          }
          return { data: null };
        }),
        axios.get(`${API_URL}/performance/web-vitals?range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          if (err.response?.status === 429) {
            console.warn('Rate limited: Web vitals. Will retry later.');
          } else {
            console.warn('Error fetching web vitals:', err);
          }
          return { data: null };
        }),
        axios.get(`${API_URL}/performance/api-metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          if (err.response?.status === 429) {
            console.warn('Rate limited: Cached metrics. Will retry later.');
          } else {
            console.warn('Error fetching cached metrics:', err);
          }
          return { data: { metrics: [] } };
        })
      ]);

      setApiStats(apiStatsRes.data);
      setWebVitals(webVitalsRes.data);
      setCachedMetrics(metricsRes.data?.metrics || []);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Set empty data on error so UI doesn't break
      setApiStats(null);
      setWebVitals(null);
      setCachedMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange, API_URL]);

  useEffect(() => {
    fetchPerformanceData();
    // Refresh every 60 seconds (reduced frequency to avoid rate limiting)
    const interval = setInterval(fetchPerformanceData, 60000);
    return () => clearInterval(interval);
  }, [fetchPerformanceData]);

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (value, thresholds) => {
    if (value <= thresholds.good) return '#10b981'; // green
    if (value <= thresholds.needsImprovement) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return (
      <div className="performance-dashboard">
        <div className="loading-container">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  // Prepare web vitals chart data
  const webVitalsChartData = webVitals?.stats ? Object.keys(webVitals.stats).map(name => {
    const stat = webVitals.stats[name];
    return {
      name,
      average: stat.average,
      p50: stat.p50,
      p75: stat.p75,
      p95: stat.p95,
      min: stat.min,
      max: stat.max
    };
  }) : [];

  // Prepare API response time chart data
  const apiChartData = cachedMetrics.slice(-20).map(metric => ({
    endpoint: metric.endpoint?.substring(0, 30) || 'Unknown',
    responseTime: metric.responseTime,
    statusCode: metric.statusCode,
    timestamp: new Date(metric.timestamp).toLocaleTimeString()
  }));

  return (
    <div className="performance-dashboard">
      <div className="performance-header">
        <h2>Performance Dashboard</h2>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* API Performance Stats */}
      {apiStats && (
        <div className="performance-section">
          <h3>API Performance</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Average Response Time</div>
              <div className="stat-value">{formatTime(apiStats.averageResponseTime || 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value">{apiStats.totalRequests || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value" style={{ color: getStatusColor(apiStats.successRate || 100, { good: 95, needsImprovement: 90 }) }}>
                {(apiStats.successRate || 0).toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Error Rate</div>
              <div className="stat-value" style={{ color: apiStats.errorRate > 5 ? '#ef4444' : '#10b981' }}>
                {(apiStats.errorRate || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {apiChartData.length > 0 && (
            <div className="chart-container">
              <h4>Recent API Response Times</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={apiChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="responseTime" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Web Vitals */}
      {webVitals && webVitals.stats && (
        <div className="performance-section">
          <h3>Core Web Vitals</h3>
          <div className="web-vitals-grid">
            {Object.keys(webVitals.stats).map(name => {
              const stat = webVitals.stats[name];
              const thresholds = {
                CLS: { good: 0.1, needsImprovement: 0.25 },
                INP: { good: 200, needsImprovement: 500 },
                LCP: { good: 2500, needsImprovement: 4000 },
                FCP: { good: 1800, needsImprovement: 3000 },
                TTFB: { good: 800, needsImprovement: 1800 }
              };
              
              const threshold = thresholds[name] || { good: 0, needsImprovement: Infinity };
              const color = getStatusColor(stat.average, threshold);

              return (
                <div key={name} className="vital-card">
                  <div className="vital-header">
                    <span className="vital-name">{name}</span>
                    <span className="vital-rating" style={{ color }}>
                      {stat.average <= threshold.good ? '✓ Good' : 
                       stat.average <= threshold.needsImprovement ? '⚠ Needs Improvement' : 
                       '✗ Poor'}
                    </span>
                  </div>
                  <div className="vital-value" style={{ color }}>
                    {name === 'CLS' ? stat.average.toFixed(3) : formatTime(stat.average)}
                  </div>
                  <div className="vital-stats">
                    <div>P50: {name === 'CLS' ? stat.p50.toFixed(3) : formatTime(stat.p50)}</div>
                    <div>P95: {name === 'CLS' ? stat.p95.toFixed(3) : formatTime(stat.p95)}</div>
                    <div>Count: {stat.count}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {webVitalsChartData.length > 0 && (
            <div className="chart-container">
              <h4>Web Vitals Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={webVitalsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#667eea" name="Average" />
                  <Bar dataKey="p95" fill="#f59e0b" name="P95" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Cached Metrics Summary */}
      {cachedMetrics.length > 0 && (
        <div className="performance-section">
          <h3>Recent API Metrics ({cachedMetrics.length} cached)</h3>
          <div className="metrics-table">
            <table>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Response Time</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {cachedMetrics.slice(0, 10).map((metric, index) => (
                  <tr key={index}>
                    <td>{metric.endpoint || 'N/A'}</td>
                    <td>{metric.method || 'N/A'}</td>
                    <td style={{ color: metric.responseTime > 1000 ? '#ef4444' : '#10b981' }}>
                      {formatTime(metric.responseTime)}
                    </td>
                    <td>
                      <span className={`status-badge status-${Math.floor(metric.statusCode / 100)}xx`}>
                        {metric.statusCode}
                      </span>
                    </td>
                    <td>{new Date(metric.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!apiStats && !webVitals && (
        <div className="no-data">
          <p>No performance data available yet. Data will appear as users interact with the application.</p>
        </div>
      )}
    </div>
  );
}

export default PerformanceDashboard;

