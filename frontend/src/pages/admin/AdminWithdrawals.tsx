import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

interface Withdrawal {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  amount: number;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by_name?: string;
}

interface Stats {
  total: number;
  pending_total: number;
  approved_total: number;
  processing_total: number;
  completed_total: number;
  rejected_total: number;
  pending_count: number;
  approved_count: number;
  processing_count: number;
  completed_count: number;
  rejected_count: number;
}

const AdminWithdrawals = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    admin_notes: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate, statusFilter]);

  const fetchData = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [withdrawalsRes, statsRes] = await Promise.all([
        apiClient.get('/admin/withdrawals', { params }),
        apiClient.get('/admin/withdrawals/stats/summary'),
      ]);
      setWithdrawals(withdrawalsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setFormData({
      status: withdrawal.status,
      admin_notes: withdrawal.admin_notes || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedWithdrawal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;

    try {
      await apiClient.put(`/admin/withdrawals/${selectedWithdrawal.id}/status`, formData);
      fetchData();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating withdrawal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'approved':
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Withdrawal Management</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-800">${stats.completed_total?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500">{stats.completed_count} completed</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">${stats.pending_total?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500">{stats.pending_count} requests</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Approved</div>
              <div className="text-2xl font-bold text-blue-600">${stats.approved_total?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500">{stats.approved_count} requests</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Processing</div>
              <div className="text-2xl font-bold text-blue-600">${stats.processing_total?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500">{stats.processing_count} requests</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600">${stats.rejected_total?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-gray-500">{stats.rejected_count} requests</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Withdrawals Table */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{withdrawal.user_name}</div>
                      <div className="text-sm text-gray-500">{withdrawal.user_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${withdrawal.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {withdrawal.payment_method.replace('_', ' ').toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(withdrawal.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(withdrawal)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {withdrawals.length === 0 && (
              <div className="text-center py-12 text-gray-500">No withdrawals found</div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold mb-4">Manage Withdrawal</h3>
              <div className="mb-4 space-y-2">
                <div><strong>User:</strong> {selectedWithdrawal.user_name} ({selectedWithdrawal.user_email})</div>
                <div><strong>Amount:</strong> ${selectedWithdrawal.amount.toFixed(2)}</div>
                <div><strong>Payment Method:</strong> {selectedWithdrawal.payment_method.replace('_', ' ').toUpperCase()}</div>
                <div><strong>Payment Details:</strong> {selectedWithdrawal.payment_details}</div>
                <div><strong>Requested:</strong> {new Date(selectedWithdrawal.requested_at).toLocaleString()}</div>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                    <textarea
                      value={formData.admin_notes}
                      onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      placeholder="Add notes about this withdrawal..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Update Status
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWithdrawals;
