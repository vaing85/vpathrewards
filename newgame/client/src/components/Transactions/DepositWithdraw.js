import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import BackToDashboard from '../Navigation/BackToDashboard';
import './Transactions.css';

function DepositWithdraw() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [withdrawalPopup, setWithdrawalPopup] = useState({ show: false, closing: false });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (parseFloat(amount) < 5) {
      setMessage({ type: 'error', text: 'Minimum deposit amount is $5' });
      return;
    }

    if (parseFloat(amount) > 10000) {
      setMessage({ type: 'error', text: 'Maximum deposit amount is $10,000' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/transactions/deposit`,
        { amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: `Successfully deposited $${amount}` });
      setAmount('');
      await fetchUser();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Deposit failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    if (parseFloat(amount) > user.balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    if (parseFloat(amount) < 10) {
      setMessage({ type: 'error', text: 'Minimum withdrawal amount is $10' });
      return;
    }

    if (parseFloat(amount) > 5000) {
      setMessage({ type: 'error', text: 'Maximum withdrawal amount is $5,000' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const token = getAuthToken();
      const response = await axios.post(
        `${API_URL}/transactions/withdraw`,
        { amount: parseFloat(amount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAmount('');
      await fetchUser();
      setWithdrawalPopup({ show: true, closing: false });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Withdrawal request failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWithdrawalPopup = () => {
    setWithdrawalPopup({ show: true, closing: true });
    setTimeout(() => {
      setWithdrawalPopup({ show: false, closing: false });
    }, 300);
  };

  // Auto-dismiss popup after 5 seconds
  useEffect(() => {
    if (withdrawalPopup.show && !withdrawalPopup.closing) {
      const timer = setTimeout(() => {
        setWithdrawalPopup({ show: true, closing: true });
        setTimeout(() => {
          setWithdrawalPopup({ show: false, closing: false });
        }, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [withdrawalPopup.show, withdrawalPopup.closing]);

  const quickAmounts = [5, 10, 25, 50, 100];

  return (
    <div className="deposit-withdraw-container">
      <BackToDashboard />
      <div className="dw-header">
        <h2>Deposit & Withdraw</h2>
        <div className="current-balance">
          Current Balance: <span>${user?.balance?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="dw-tabs">
        <button
          type="button"
          className={`dw-tab ${activeTab === 'deposit' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('deposit');
            setAmount('');
            setMessage({ type: '', text: '' });
          }}
        >
          💰 Deposit
        </button>
        <button
          type="button"
          className={`dw-tab ${activeTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('withdraw');
            setAmount('');
            setMessage({ type: '', text: '' });
          }}
        >
          💸 Withdraw
        </button>
      </div>

      <div className="dw-content">
        {activeTab === 'deposit' ? (
          <form onSubmit={handleDeposit} className="dw-form">
            <div className="dw-form-group">
              <label>Deposit Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="5"
                max="10000"
                step="0.01"
                className="dw-input"
                disabled={loading}
              />
              <div className="quick-amounts">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="quick-amount-btn"
                    disabled={loading}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>
            <div className="dw-info">
              <p>• Minimum deposit: $5</p>
              <p>• Maximum deposit: $10,000</p>
              <p>• Funds are available immediately</p>
            </div>
            {message.text && (
              <div className={`dw-message ${message.type}`}>
                {message.text}
              </div>
            )}
            <button type="submit" className="dw-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleWithdraw} className="dw-form">
            <div className="dw-form-group">
              <label>Withdrawal Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="10"
                max={user?.balance || 5000}
                step="0.01"
                className="dw-input"
                disabled={loading}
              />
              <div className="quick-amounts">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="quick-amount-btn"
                    disabled={loading || quickAmount > (user?.balance || 0)}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>
            <div className="dw-info">
              <p>• Minimum withdrawal: $10</p>
              <p>• Maximum withdrawal: $5,000</p>
              <p>• Withdrawals require admin approval</p>
              <p>• Available balance: ${user?.balance?.toFixed(2) || '0.00'}</p>
            </div>
            {message.text && (
              <div className={`dw-message ${message.type}`}>
                {message.text}
              </div>
            )}
            <button type="submit" className="dw-submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        )}
      </div>

      {withdrawalPopup.show && (
        <div 
          className={`withdrawal-popup-overlay ${withdrawalPopup.closing ? 'closing' : ''}`}
          onClick={(e) => {
            if (e.target.classList.contains('withdrawal-popup-overlay')) {
              handleCloseWithdrawalPopup();
            }
          }}
        >
          <div className={`withdrawal-popup ${withdrawalPopup.closing ? 'closing' : ''}`}>
            <button 
              className="withdrawal-popup-close-btn"
              onClick={handleCloseWithdrawalPopup}
              aria-label="Close"
            >
              ×
            </button>
            <div className="withdrawal-popup-icon">
              <span>⏳</span>
            </div>
            <h2>Withdrawal Request Submitted</h2>
            <p className="withdrawal-popup-message">
              Your withdrawal request is pending admin approval.
            </p>
            <p className="withdrawal-popup-note">
              You will be notified once your request has been processed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepositWithdraw;

