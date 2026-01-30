import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import BackToDashboard from '../Navigation/BackToDashboard';
import './Transactions.css';

function TransactionHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await axios.get(
        `${API_URL}/transactions/history?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTransactions(response.data.transactions);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      deposit: '💰',
      withdrawal: '💸',
      bet: '🎲',
      win: '🎉',
      bonus: '🎁',
      refund: '↩️'
    };
    return icons[type] || '📝';
  };

  const getTypeColor = (type) => {
    const colors = {
      deposit: '#4ade80',
      withdrawal: '#f59e0b',
      bet: '#3b82f6',
      win: '#10b981',
      bonus: '#8b5cf6',
      refund: '#ef4444'
    };
    return colors[type] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { text: 'Completed', class: 'status-completed' },
      pending: { text: 'Pending', class: 'status-pending' },
      failed: { text: 'Failed', class: 'status-failed' },
      cancelled: { text: 'Cancelled', class: 'status-cancelled' }
    };
    return badges[status] || { text: status, class: 'status-unknown' };
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

  return (
    <div className="transaction-history-container">
      <BackToDashboard />
      <div className="transaction-history-header">
        <h2>Transaction History</h2>
      </div>

      <div className="transaction-filters">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="bet">Bet</option>
          <option value="win">Win</option>
          <option value="bonus">Bonus</option>
          <option value="refund">Refund</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="no-transactions">No transactions found</div>
      ) : (
        <>
          <div className="transactions-list">
            {transactions.map((transaction) => {
              const statusBadge = getStatusBadge(transaction.status);
              return (
                <div key={transaction._id} className="transaction-item">
                  <div className="transaction-icon" style={{ backgroundColor: getTypeColor(transaction.type) + '20' }}>
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-header">
                      <span className="transaction-type" style={{ color: getTypeColor(transaction.type) }}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </span>
                      <span className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    <div className="transaction-description">
                      {transaction.description || transaction.game || 'Transaction'}
                    </div>
                    <div className="transaction-meta">
                      {formatDate(transaction.createdAt)}
                      {transaction.game && (
                        <span className="transaction-game"> • {transaction.game}</span>
                      )}
                    </div>
                  </div>
                  <div className="transaction-amounts">
                    <div className={`amount ${transaction.type === 'deposit' || transaction.type === 'win' || transaction.type === 'bonus' ? 'positive' : 'negative'}`}>
                      {transaction.type === 'deposit' || transaction.type === 'win' || transaction.type === 'bonus' ? '+' : '-'}
                      ${transaction.amount.toFixed(2)}
                    </div>
                    <div className="balance-after">
                      Balance: ${transaction.balanceAfter.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
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
                Page {pagination.page} of {pagination.totalPages}
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

export default TransactionHistory;

