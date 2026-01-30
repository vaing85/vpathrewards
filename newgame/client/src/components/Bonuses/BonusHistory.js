import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../../utils/authToken';
import BackToDashboard from '../Navigation/BackToDashboard';
import './BonusHistory.css';

function BonusHistory() {
  const navigate = useNavigate();
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchBonusHistory();
  }, []);

  const fetchBonusHistory = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await axios.get(
        `${API_URL}/bonuses/history?limit=50&page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBonuses(response.data.bonuses);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching bonus history:', error);
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

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBonusTypeLabel = (type) => {
    const labels = {
      welcome: 'Welcome Bonus',
      daily_login: 'Daily Login Bonus',
      deposit: 'Deposit Bonus',
      promotion: 'Promotion Bonus',
      referral: 'Referral Bonus'
    };
    return labels[type] || type;
  };

  const getBonusIcon = (type) => {
    const icons = {
      welcome: '🎁',
      daily_login: '📅',
      deposit: '💰',
      promotion: '🎉',
      referral: '👥'
    };
    return icons[type] || '🎁';
  };

  return (
    <div className="bonus-history-container">
      <BackToDashboard />
      <div className="bonus-history-header">
        <h2>🎁 Bonus History</h2>
        <p className="subtitle">View all your bonus rewards</p>
      </div>

      <div className="bonus-history-content">
        {loading ? (
          <div className="loading">Loading bonus history...</div>
        ) : bonuses.length === 0 ? (
          <div className="no-bonuses">
            <div className="no-bonuses-icon">🎁</div>
            <h3>No Bonuses Yet</h3>
            <p>Start playing to earn bonuses!</p>
          </div>
        ) : (
          <div className="bonus-list">
            {bonuses.map((bonus) => (
              <div key={bonus._id} className="bonus-item">
                <div className="bonus-icon">{getBonusIcon(bonus.type)}</div>
                <div className="bonus-details">
                  <div className="bonus-header">
                    <h3>{getBonusTypeLabel(bonus.type)}</h3>
                    <span className="bonus-amount">{formatCurrency(bonus.amount)}</span>
                  </div>
                  {bonus.promotion && bonus.promotion.name && (
                    <p className="bonus-promotion">{bonus.promotion.name}</p>
                  )}
                  <p className="bonus-date">{formatDate(bonus.createdAt)}</p>
                  <div className="bonus-status">
                    <span className={`status-badge ${bonus.status}`}>
                      {bonus.status.charAt(0).toUpperCase() + bonus.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BonusHistory;

