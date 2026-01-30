import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import './DailyLoginBonus.css';

function DailyLoginBonus() {
  const { fetchUser } = useAuth();
  const [canClaim, setCanClaim] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    checkDailyBonusStatus();
  }, []);

  const checkDailyBonusStatus = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_URL}/bonuses/daily-login/status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCanClaim(response.data.canClaim);
      setBonusAmount(response.data.bonusAmount);
    } catch (error) {
      console.error('Error checking daily bonus status:', error);
    }
  };

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setMessage('');
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/bonuses/daily-login`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`🎉 You received $${response.data.bonus.amount.toFixed(2)}!`);
      setCanClaim(false);
      await fetchUser(); // Refresh user balance
      
      // Refresh status after a delay
      setTimeout(() => {
        checkDailyBonusStatus();
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error claiming bonus');
    } finally {
      setClaiming(false);
    }
  };

  if (!canClaim) {
    return null; // Don't show if already claimed today
  }

  return (
    <div className="daily-login-bonus">
      <div className="daily-bonus-content">
        <div className="daily-bonus-icon">📅</div>
        <div className="daily-bonus-info">
          <h3>Daily Login Bonus</h3>
          <p>Claim your ${bonusAmount.toFixed(2)} bonus today!</p>
        </div>
        <button
          className="claim-bonus-btn"
          onClick={handleClaim}
          disabled={claiming || loading}
        >
          {claiming ? 'Claiming...' : `Claim $${bonusAmount.toFixed(2)}`}
        </button>
      </div>
      {message && (
        <div className={`bonus-message ${message.includes('🎉') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default DailyLoginBonus;

