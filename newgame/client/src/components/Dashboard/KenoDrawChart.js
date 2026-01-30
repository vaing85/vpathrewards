import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KenoDrawChart.css';

function KenoDrawChart() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchDraws();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDraws, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDraws = async () => {
    try {
      const response = await axios.get(`${API_URL}/games/keno/draws?limit=10`);
      setDraws(response.data.draws || []);
    } catch (error) {
      console.error('Error fetching Keno draws:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="keno-draw-chart card">
        <h2>🎰 Recent Keno Draws</h2>
        <div className="loading">Loading draws...</div>
      </div>
    );
  }

  return (
    <div className="keno-draw-chart card">
      <h2>🎰 Recent Keno Draws</h2>
      <div className="draws-container">
        {draws.length === 0 ? (
          <div className="no-draws">No recent draws available</div>
        ) : (
          draws.map((draw, index) => (
            <div key={index} className="draw-item">
              <div className="draw-header">
                <span className="draw-time">{formatTime(draw.timestamp)}</span>
              </div>
              <div className="winning-numbers-grid">
                {draw.winningNumbers.map((num, numIndex) => (
                  <span key={numIndex} className="drawn-number">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default KenoDrawChart;

