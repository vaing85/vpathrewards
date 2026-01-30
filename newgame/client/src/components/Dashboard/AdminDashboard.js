import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getAuthToken } from '../../utils/authToken';
import Analytics from '../Analytics/Analytics';
import PerformanceDashboard from '../Performance/PerformanceDashboard';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import NotificationBell from '../Notifications/NotificationBell';
import './Dashboard.css';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null); // 'balance' or 'role'
  const [balanceAdjustment, setBalanceAdjustment] = useState('');
  const [newRole, setNewRole] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState(null);
  const [transactionFilters, setTransactionFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [transactionPagination, setTransactionPagination] = useState({});
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'transactions', 'promotions', 'analytics', or 'performance'
  const [rejectModal, setRejectModal] = useState({ show: false, transactionId: null, reason: '' });
  const [promotions, setPromotions] = useState([]);
  const [promotionModal, setPromotionModal] = useState({ show: false, promotion: null });
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    description: '',
    type: 'welcome',
    bonusType: 'fixed',
    bonusValue: '',
    minDeposit: '',
    maxBonus: '',
    startDate: '',
    endDate: '',
    maxUses: '',
    maxUsesPerUser: '1'
  });
  const [loadingStates, setLoadingStates] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Define all fetch functions first using useCallback
  const fetchUsers = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Don't break the UI if this fails
    }
  }, [API_URL]);

  const fetchStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't break the UI if this fails
    }
  }, [API_URL]);

  const fetchTransactionStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_URL}/admin/transactions/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTransactionStats(response.data);
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    }
  }, [API_URL]);

  const fetchTransactions = useCallback(async () => {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (transactionFilters.type) params.append('type', transactionFilters.type);
      if (transactionFilters.status) params.append('status', transactionFilters.status);
      params.append('page', transactionFilters.page);
      params.append('limit', transactionFilters.limit);

      const response = await axios.get(
        `${API_URL}/admin/transactions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTransactions(response.data.transactions);
      setTransactionPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [API_URL, transactionFilters]);

  const fetchPromotions = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(
        `${API_URL}/admin/promotions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPromotions(response.data.promotions);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  }, [API_URL]);

  // Now define useEffect hooks after all functions are defined
  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchTransactionStats();
  }, [fetchUsers, fetchStats, fetchTransactionStats]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'promotions') {
      fetchPromotions();
    }
  }, [activeTab, fetchTransactions, fetchPromotions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle shortcuts when not typing in inputs/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + number keys for tab switching
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const key = e.key;
        if (key === '1') {
          e.preventDefault();
          setActiveTab('users');
        } else if (key === '2') {
          e.preventDefault();
          setActiveTab('transactions');
        } else if (key === '3') {
          e.preventDefault();
          setActiveTab('promotions');
        } else if (key === '4') {
          e.preventDefault();
          setActiveTab('analytics');
        } else if (key === '5') {
          e.preventDefault();
          setActiveTab('performance');
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        if (selectedUser && modalType) {
          setSelectedUser(null);
          setModalType(null);
          setBalanceAdjustment('');
          setNewRole('');
        }
        if (promotionModal.show) {
          setPromotionModal({ show: false, promotion: null });
        }
        if (rejectModal.show) {
          setRejectModal({ show: false, transactionId: null, reason: '' });
        }
      }

      // Ctrl/Cmd + N for new promotion (only in promotions tab)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && activeTab === 'promotions') {
        e.preventDefault();
        handleCreatePromotion();
      }

      // Ctrl/Cmd + R to refresh current tab data
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (activeTab === 'users') {
          fetchUsers();
          fetchStats();
        } else if (activeTab === 'transactions') {
          fetchTransactions();
          fetchTransactionStats();
        } else if (activeTab === 'promotions') {
          fetchPromotions();
        }
        showToast('Data refreshed', 'success');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab, selectedUser, modalType, promotionModal, rejectModal, fetchUsers, fetchStats, fetchTransactions, fetchTransactionStats, fetchPromotions, handleCreatePromotion]);

  const handleBalanceAdjustment = async (userId) => {
    const adjustmentAmount = parseFloat(balanceAdjustment);
    const user = users.find(u => u._id === userId);
    if (!user) return;

    // Optimistic update
    const previousBalance = user.balance;
    const newBalance = previousBalance + adjustmentAmount;
    setUsers(users.map(u => 
      u._id === userId ? { ...u, balance: newBalance } : u
    ));
    setLoadingStates({ ...loadingStates, [`balance-${userId}`]: true });

    try {
      const token = getAuthToken();
      await axios.put(`${API_URL}/admin/users/${userId}/balance`, {
        amount: adjustmentAmount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUsers(); // Refresh to get accurate data
      setBalanceAdjustment('');
      setSelectedUser(null);
      setModalType(null);
      showToast('Balance updated successfully!', 'success');
    } catch (error) {
      // Revert optimistic update on error
      setUsers(users.map(u => 
        u._id === userId ? { ...u, balance: previousBalance } : u
      ));
      const errorMsg = error.response?.data?.message || 'Failed to update balance';
      showToast(getErrorMessage(errorMsg, 'balance update'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`balance-${userId}`]: false });
    }
  };

  const handleRoleChange = async (userId) => {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    // Optimistic update
    const previousRole = user.role;
    setUsers(users.map(u => 
      u._id === userId ? { ...u, role: newRole } : u
    ));
    setLoadingStates({ ...loadingStates, [`role-${userId}`]: true });

    try {
      const token = getAuthToken();
      await axios.put(`${API_URL}/admin/users/${userId}/role`, {
        role: newRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUsers(); // Refresh to get accurate data
      setNewRole('');
      setSelectedUser(null);
      setModalType(null);
      showToast('Role updated successfully!', 'success');
    } catch (error) {
      // Revert optimistic update on error
      setUsers(users.map(u => 
        u._id === userId ? { ...u, role: previousRole } : u
      ));
      const errorMsg = error.response?.data?.message || 'Failed to update role';
      showToast(getErrorMessage(errorMsg, 'role change'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`role-${userId}`]: false });
    }
  };

  const handleApproveWithdrawal = async (transactionId) => {
    const transaction = transactions.find(t => t._id === transactionId);
    if (!transaction) return;

    // Optimistic update
    const previousStatus = transaction.status;
    setTransactions(transactions.map(t => 
      t._id === transactionId ? { ...t, status: 'completed' } : t
    ));
    setLoadingStates({ ...loadingStates, [`approve-${transactionId}`]: true });

    try {
      const token = getAuthToken();
      await axios.put(
        `${API_URL}/admin/transactions/${transactionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchTransactions();
      await fetchUsers();
      await fetchTransactionStats();
      showToast('Withdrawal approved successfully!', 'success');
    } catch (error) {
      // Revert optimistic update on error
      setTransactions(transactions.map(t => 
        t._id === transactionId ? { ...t, status: previousStatus } : t
      ));
      const errorMsg = error.response?.data?.message || 'Failed to approve withdrawal';
      showToast(getErrorMessage(errorMsg, 'withdrawal approval'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`approve-${transactionId}`]: false });
    }
  };

  const handleRejectWithdrawal = (transactionId) => {
    setRejectModal({ show: true, transactionId, reason: '' });
  };

  const confirmRejectWithdrawal = async () => {
    if (!rejectModal.transactionId) return;
    
    const transaction = transactions.find(t => t._id === rejectModal.transactionId);
    if (!transaction) return;

    // Optimistic update
    const previousStatus = transaction.status;
    setTransactions(transactions.map(t => 
      t._id === rejectModal.transactionId ? { ...t, status: 'cancelled' } : t
    ));
    setLoadingStates({ ...loadingStates, [`reject-${rejectModal.transactionId}`]: true });

    try {
      const token = getAuthToken();
      await axios.put(
        `${API_URL}/admin/transactions/${rejectModal.transactionId}/reject`,
        { reason: rejectModal.reason || '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchTransactions();
      await fetchTransactionStats();
      setRejectModal({ show: false, transactionId: null, reason: '' });
      showToast('Withdrawal rejected successfully', 'success');
    } catch (error) {
      // Revert optimistic update on error
      setTransactions(transactions.map(t => 
        t._id === rejectModal.transactionId ? { ...t, status: previousStatus } : t
      ));
      const errorMsg = error.response?.data?.message || 'Failed to reject withdrawal';
      showToast(getErrorMessage(errorMsg, 'withdrawal rejection'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`reject-${rejectModal.transactionId}`]: false });
    }
  };


  const handleCreatePromotion = () => {
    setPromotionForm({
      name: '',
      description: '',
      type: 'welcome',
      bonusType: 'fixed',
      bonusValue: '',
      minDeposit: '',
      maxBonus: '',
      startDate: '',
      endDate: '',
      maxUses: '',
      maxUsesPerUser: '1'
    });
    setPromotionModal({ show: true, promotion: null });
  };

  const handleEditPromotion = (promotion) => {
    setPromotionForm({
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      bonusType: promotion.bonusType,
      bonusValue: promotion.bonusValue,
      minDeposit: promotion.minDeposit || '',
      maxBonus: promotion.maxBonus || '',
      startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split('T')[0] : '',
      endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split('T')[0] : '',
      maxUses: promotion.maxUses || '',
      maxUsesPerUser: promotion.maxUsesPerUser || '1'
    });
    setPromotionModal({ show: true, promotion });
  };

  const handleSavePromotion = async () => {
    const isUpdate = !!promotionModal.promotion;
    const promotionId = promotionModal.promotion?._id;
    
    // For updates, store previous state for rollback
    const previousPromotion = isUpdate ? promotions.find(p => p._id === promotionId) : null;
    
    setLoadingStates({ ...loadingStates, 'save-promotion': true });

    try {
      const token = getAuthToken();
      const data = {
        ...promotionForm,
        bonusValue: parseFloat(promotionForm.bonusValue),
        minDeposit: promotionForm.minDeposit ? parseFloat(promotionForm.minDeposit) : 0,
        maxBonus: promotionForm.maxBonus ? parseFloat(promotionForm.maxBonus) : null,
        maxUses: promotionForm.maxUses ? parseInt(promotionForm.maxUses) : null,
        maxUsesPerUser: parseInt(promotionForm.maxUsesPerUser),
        startDate: promotionForm.startDate || new Date().toISOString(),
        endDate: promotionForm.endDate || null
      };

      if (isUpdate) {
        // Optimistic update for edit
        setPromotions(promotions.map(p => 
          p._id === promotionId ? { ...p, ...data } : p
        ));
        
        await axios.put(
          `${API_URL}/admin/promotions/${promotionId}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast('Promotion updated successfully!', 'success');
      } else {
        // For create, we'll just show loading, then refresh
        const response = await axios.post(
          `${API_URL}/admin/promotions`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast('Promotion created successfully!', 'success');
      }
      
      setPromotionModal({ show: false, promotion: null });
      await fetchPromotions(); // Refresh to get accurate data
    } catch (error) {
      // Revert optimistic update on error (for updates only)
      if (isUpdate && previousPromotion) {
        setPromotions(promotions.map(p => 
          p._id === promotionId ? previousPromotion : p
        ));
      }
      const errorMsg = error.response?.data?.message || 'Failed to save promotion';
      showToast(getErrorMessage(errorMsg, 'promotion save'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, 'save-promotion': false });
    }
  };

  // Helper function to provide actionable error messages
  const getErrorMessage = (errorMessage, action) => {
    const lowerMsg = errorMessage.toLowerCase();
    
    if (lowerMsg.includes('network') || lowerMsg.includes('timeout')) {
      return `${action} failed: Network error. Please check your connection and try again.`;
    }
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('401')) {
      return `${action} failed: Your session expired. Please log in again.`;
    }
    if (lowerMsg.includes('forbidden') || lowerMsg.includes('403')) {
      return `${action} failed: You don't have permission to perform this action.`;
    }
    if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
      return `${action} failed: The item was not found. It may have been deleted.`;
    }
    if (lowerMsg.includes('validation') || lowerMsg.includes('invalid')) {
      return `${action} failed: ${errorMessage}. Please check your input and try again.`;
    }
    if (lowerMsg.includes('rate limit') || lowerMsg.includes('429')) {
      return `${action} failed: Too many requests. Please wait a moment and try again.`;
    }
    
    return `${action} failed: ${errorMessage}`;
  };

  const handleDeletePromotion = async (promotionId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    
    const promotion = promotions.find(p => p._id === promotionId);
    if (!promotion) return;

    // Optimistic update - remove from list
    const deletedPromotion = promotion;
    setPromotions(promotions.filter(p => p._id !== promotionId));
    setLoadingStates({ ...loadingStates, [`delete-${promotionId}`]: true });

    try {
      const token = getAuthToken();
      await axios.delete(
        `${API_URL}/admin/promotions/${promotionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchPromotions(); // Refresh to get accurate data
      showToast('Promotion deleted successfully!', 'success');
    } catch (error) {
      // Revert optimistic update on error
      setPromotions([...promotions, deletedPromotion].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
      const errorMsg = error.response?.data?.message || 'Failed to delete promotion';
      showToast(getErrorMessage(errorMsg, 'promotion deletion'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`delete-${promotionId}`]: false });
    }
  };

  const handleTogglePromotion = async (promotionId, currentStatus) => {
    const promotion = promotions.find(p => p._id === promotionId);
    if (!promotion) return;

    // Optimistic update
    const newStatus = !currentStatus;
    setPromotions(promotions.map(p => 
      p._id === promotionId ? { ...p, active: newStatus } : p
    ));
    setLoadingStates({ ...loadingStates, [`toggle-${promotionId}`]: true });

    try {
      const token = getAuthToken();
      await axios.put(
        `${API_URL}/admin/promotions/${promotionId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchPromotions(); // Refresh to get accurate data
      showToast(`Promotion ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
    } catch (error) {
      // Revert optimistic update on error
      setPromotions(promotions.map(p => 
        p._id === promotionId ? { ...p, active: currentStatus } : p
      ));
      const errorMsg = error.response?.data?.message || 'Failed to toggle promotion';
      showToast(getErrorMessage(errorMsg, 'promotion toggle'), 'error');
    } finally {
      setLoadingStates({ ...loadingStates, [`toggle-${promotionId}`]: false });
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>👑 Admin Dashboard</h1>
        <div className="header-actions">
          <div className="keyboard-shortcuts-hint" title="Keyboard Shortcuts: Ctrl+1-5 (Tabs), Ctrl+N (New Promotion), Ctrl+R (Refresh), Esc (Close Modals)">
            ⌨️
          </div>
          <ThemeToggle />
          <NotificationBell />
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💳 Transactions
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            🎁 Promotions
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            ⚡ Performance
          </button>
        </div>

        {stats && (
          <div className="stats-overview card">
            <h2>Platform Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{stats.totalUsers}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Players</div>
                <div className="stat-value">{stats.totalPlayers}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Balance</div>
                <div className="stat-value">${stats.totalBalance}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Bets</div>
                <div className="stat-value">${stats.totalBets}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Winnings</div>
                <div className="stat-value">${stats.totalWinnings}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Platform Profit</div>
                <div className="stat-value">${stats.platformProfit}</div>
              </div>
            </div>
          </div>
        )}

        {transactionStats && activeTab === 'transactions' && (
          <div className="transaction-stats card">
            <h2>Transaction Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Total Deposits</div>
                <div className="stat-value">${transactionStats.totalDeposits?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Withdrawals</div>
                <div className="stat-value">${transactionStats.totalWithdrawals?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Bets</div>
                <div className="stat-value">${transactionStats.totalBets?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Total Wins</div>
                <div className="stat-value">${transactionStats.totalWins?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Net Revenue</div>
                <div className="stat-value">${transactionStats.netRevenue?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Pending Withdrawals</div>
                <div className="stat-value">{transactionStats.pendingWithdrawals || 0}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
        <div className="users-section card">
          <h2>User Management</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Total Bets</th>
                  <th>Total Winnings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td>${u.balance}</td>
                    <td>${u.totalBets}</td>
                    <td>${u.totalWinnings}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setModalType('balance');
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          Balance
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setModalType('role');
                            setNewRole(u.role);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions-section card">
            <h2>Transaction Management</h2>
            <div className="transaction-filters">
              <select
                value={transactionFilters.type}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value, page: 1 })}
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
                value={transactionFilters.status}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, status: e.target.value, page: 1 })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="admin-transactions-list">
              {transactions.length === 0 ? (
                <div className="no-transactions">No transactions found</div>
              ) : (
                <>
                  <table className="transactions-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction._id}>
                          <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                          <td>
                            {transaction.user?.username || 'N/A'}
                            <br />
                            <small>{transaction.user?.email || ''}</small>
                          </td>
                          <td>
                            <span className={`transaction-type-badge ${transaction.type}`}>
                              {transaction.type}
                            </span>
                          </td>
                          <td>${transaction.amount.toFixed(2)}</td>
                          <td>
                            <span className={`status-badge status-${transaction.status}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td>
                            {transaction.type === 'withdrawal' && transaction.status === 'pending' && (
                              <div className="transaction-actions">
                                <button
                                  onClick={() => handleApproveWithdrawal(transaction._id)}
                                  className="btn btn-success btn-sm"
                                  disabled={loadingStates[`approve-${transaction._id}`]}
                                >
                                  {loadingStates[`approve-${transaction._id}`] ? '⏳ Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(transaction._id)}
                                  className="btn btn-danger btn-sm"
                                  disabled={loadingStates[`reject-${transaction._id}`]}
                                >
                                  {loadingStates[`reject-${transaction._id}`] ? '⏳ Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {transactionPagination.totalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setTransactionFilters({ ...transactionFilters, page: transactionFilters.page - 1 })}
                        disabled={transactionFilters.page === 1}
                        className="pagination-btn"
                      >
                        Previous
                      </button>
                      <span className="pagination-info">
                        Page {transactionPagination.page} of {transactionPagination.totalPages}
                      </span>
                      <button
                        onClick={() => setTransactionFilters({ ...transactionFilters, page: transactionFilters.page + 1 })}
                        disabled={transactionFilters.page >= transactionPagination.totalPages}
                        className="pagination-btn"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className="promotions-section card">
            <div className="section-header">
              <h2>Promotion Management</h2>
              <button onClick={handleCreatePromotion} className="btn btn-primary">
                + Create Promotion
              </button>
            </div>

            {promotions.length === 0 ? (
              <div className="empty-state">
                <p>No promotions found. Create your first promotion!</p>
              </div>
            ) : (
              <div className="promotions-list">
                {promotions.map((promotion) => (
                  <div key={promotion._id} className={`promotion-item ${!promotion.active ? 'inactive' : ''}`}>
                    <div className="promotion-header">
                      <div>
                        <h3>{promotion.name}</h3>
                        <p className="promotion-description">{promotion.description}</p>
                      </div>
                      <div className="promotion-status">
                        <span className={`status-badge ${promotion.active ? 'active' : 'inactive'}`}>
                          {promotion.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="promotion-details">
                      <div className="detail-item">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{promotion.type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Bonus:</span>
                        <span className="detail-value">
                          {promotion.bonusType === 'percentage' 
                            ? `${promotion.bonusValue}%` 
                            : `$${promotion.bonusValue.toFixed(2)}`}
                          {promotion.maxBonus && promotion.bonusType === 'percentage' && 
                            ` (max $${promotion.maxBonus.toFixed(2)})`}
                        </span>
                      </div>
                      {promotion.type === 'deposit' && promotion.minDeposit > 0 && (
                        <div className="detail-item">
                          <span className="detail-label">Min Deposit:</span>
                          <span className="detail-value">${promotion.minDeposit.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Uses:</span>
                        <span className="detail-value">
                          {promotion.currentUses || 0}
                          {promotion.maxUses ? ` / ${promotion.maxUses}` : ' / Unlimited'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Per User:</span>
                        <span className="detail-value">{promotion.maxUsesPerUser} time(s)</span>
                      </div>
                      {promotion.endDate && (
                        <div className="detail-item">
                          <span className="detail-label">Ends:</span>
                          <span className="detail-value">
                            {new Date(promotion.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="promotion-actions">
                      <button
                        onClick={() => handleTogglePromotion(promotion._id, promotion.active)}
                        className={`btn ${promotion.active ? 'btn-warning' : 'btn-success'}`}
                        disabled={loadingStates[`toggle-${promotion._id}`]}
                      >
                        {loadingStates[`toggle-${promotion._id}`] 
                          ? '⏳...' 
                          : (promotion.active ? 'Deactivate' : 'Activate')}
                      </button>
                      <button
                        onClick={() => handleEditPromotion(promotion)}
                        className="btn btn-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promotion._id)}
                        className="btn btn-danger"
                        disabled={loadingStates[`delete-${promotion._id}`]}
                      >
                        {loadingStates[`delete-${promotion._id}`] ? '⏳ Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <Analytics />
        )}

        {activeTab === 'performance' && (
          <PerformanceDashboard />
        )}

        {selectedUser && modalType === 'balance' && (
          <div className="modal-overlay" onClick={() => { setSelectedUser(null); setModalType(null); }}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
              <h2>Adjust Balance for {selectedUser.username}</h2>
              <p>Current Balance: ${selectedUser.balance}</p>
              <div className="balance-input-group">
                <input
                  type="number"
                  id="admin-balance-adjustment"
                  name="balanceAdjustment"
                  placeholder="Amount (positive to add, negative to subtract)"
                  value={balanceAdjustment}
                  onChange={(e) => setBalanceAdjustment(e.target.value)}
                  className="input"
                />
                <div className="balance-button-group">
                  <button
                    onClick={() => handleBalanceAdjustment(selectedUser._id)}
                    className="btn btn-success"
                    disabled={loadingStates[`balance-${selectedUser._id}`]}
                  >
                    {loadingStates[`balance-${selectedUser._id}`] ? '⏳ Updating...' : 'Update Balance'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setBalanceAdjustment('');
                      setModalType(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedUser && modalType === 'role' && (
          <div className="modal-overlay" onClick={() => { setSelectedUser(null); setModalType(null); }}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
              <h2>Change Role for {selectedUser.username}</h2>
              <p>Current Role: <span className={`role-badge ${selectedUser.role}`}>{selectedUser.role}</span></p>
              <div className="role-input-group">
                <label>New Role:</label>
                <select
                  id="admin-role-select"
                  name="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="input"
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="modal-buttons">
                  <button
                    onClick={() => handleRoleChange(selectedUser._id)}
                    className="btn btn-success"
                    disabled={newRole === selectedUser.role || loadingStates[`role-${selectedUser._id}`]}
                  >
                    {loadingStates[`role-${selectedUser._id}`] ? '⏳ Updating...' : 'Update Role'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setNewRole('');
                      setModalType(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {rejectModal.show && (
          <div className="modal-overlay" onClick={() => setRejectModal({ show: false, transactionId: null, reason: '' })}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
              <h2>Reject Withdrawal</h2>
              <p>Are you sure you want to reject this withdrawal request?</p>
              <div className="role-input-group">
                <label>Rejection Reason (optional):</label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Enter reason for rejection..."
                  className="input"
                  rows="3"
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div className="modal-buttons">
                  <button
                    onClick={confirmRejectWithdrawal}
                    className="btn btn-danger"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => setRejectModal({ show: false, transactionId: null, reason: '' })}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {promotionModal.show && (
          <div className="modal-overlay" onClick={() => setPromotionModal({ show: false, promotion: null })}>
            <div className="modal-content card promotion-modal" onClick={(e) => e.stopPropagation()}>
              <h2>{promotionModal.promotion ? 'Edit Promotion' : 'Create Promotion'}</h2>
              <div className="promotion-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={promotionForm.name}
                    onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                    className="input"
                    placeholder="Promotion name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={promotionForm.description}
                    onChange={(e) => setPromotionForm({ ...promotionForm, description: e.target.value })}
                    className="input"
                    placeholder="Promotion description"
                    rows="3"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      value={promotionForm.type}
                      onChange={(e) => setPromotionForm({ ...promotionForm, type: e.target.value })}
                      className="input"
                    >
                      <option value="welcome">Welcome</option>
                      <option value="deposit">Deposit</option>
                      <option value="daily_login">Daily Login</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bonus Type *</label>
                    <select
                      value={promotionForm.bonusType}
                      onChange={(e) => setPromotionForm({ ...promotionForm, bonusType: e.target.value })}
                      className="input"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bonus Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={promotionForm.bonusValue}
                      onChange={(e) => setPromotionForm({ ...promotionForm, bonusValue: e.target.value })}
                      className="input"
                      placeholder={promotionForm.bonusType === 'percentage' ? 'e.g., 50 for 50%' : 'e.g., 10.00'}
                      required
                    />
                  </div>
                  {promotionForm.bonusType === 'percentage' && (
                    <div className="form-group">
                      <label>Max Bonus</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={promotionForm.maxBonus}
                        onChange={(e) => setPromotionForm({ ...promotionForm, maxBonus: e.target.value })}
                        className="input"
                        placeholder="Optional max amount"
                      />
                    </div>
                  )}
                </div>
                {promotionForm.type === 'deposit' && (
                  <div className="form-group">
                    <label>Minimum Deposit</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={promotionForm.minDeposit}
                      onChange={(e) => setPromotionForm({ ...promotionForm, minDeposit: e.target.value })}
                      className="input"
                      placeholder="Minimum deposit amount"
                    />
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={promotionForm.startDate}
                      onChange={(e) => setPromotionForm({ ...promotionForm, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date (optional)</label>
                    <input
                      type="date"
                      value={promotionForm.endDate}
                      onChange={(e) => setPromotionForm({ ...promotionForm, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Max Uses (optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={promotionForm.maxUses}
                      onChange={(e) => setPromotionForm({ ...promotionForm, maxUses: e.target.value })}
                      className="input"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Uses Per User *</label>
                    <input
                      type="number"
                      min="1"
                      value={promotionForm.maxUsesPerUser}
                      onChange={(e) => setPromotionForm({ ...promotionForm, maxUsesPerUser: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div className="modal-buttons">
                  <button 
                    onClick={handleSavePromotion} 
                    className="btn btn-success"
                    disabled={loadingStates['save-promotion']}
                  >
                    {loadingStates['save-promotion'] 
                      ? '⏳ Saving...' 
                      : (promotionModal.promotion ? 'Update' : 'Create')}
                  </button>
                  <button
                    onClick={() => setPromotionModal({ show: false, promotion: null })}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

