import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

interface Balance {
  total_earnings: number;
  pending_withdrawals: number;
  available_balance: number;
  min_withdrawal: number;
  can_withdraw: boolean;
}

interface Withdrawal {
  id: number;
  amount: number;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by_name?: string;
}

const Withdrawals = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'paypal',
    payment_details: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      const [balanceRes, withdrawalsRes] = await Promise.all([
        apiClient.get('/withdrawals/balance/available'),
        apiClient.get('/withdrawals/history'),
      ]);
      setBalance(balanceRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Error fetching withdrawal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await apiClient.post('/withdrawals/request', formData);
      setShowForm(false);
      setFormData({ amount: '', payment_method: 'paypal', payment_details: '' });
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Withdrawals</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Balance Card */}
            {balance && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Balance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
                    <div className="text-2xl font-bold text-gray-800">
                      ${balance.total_earnings.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Pending Withdrawals</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      ${balance.pending_withdrawals.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Available to Withdraw</div>
                    <div className="text-2xl font-bold text-primary-600">
                      ${balance.available_balance.toFixed(2)}
                    </div>
                  </div>
                </div>
                {balance.can_withdraw ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition"
                  >
                    Request Withdrawal
                  </button>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">
                    Minimum withdrawal amount is ${balance.min_withdrawal.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Withdrawal Request Form */}
            {showForm && balance && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Request Withdrawal</h2>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (Min: ${balance.min_withdrawal.toFixed(2)})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={balance.min_withdrawal}
                        max={balance.available_balance}
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={`Max: $${balance.available_balance.toFixed(2)}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="paypal">PayPal</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="venmo">Venmo</option>
                        <option value="zelle">Zelle</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Details
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.payment_details}
                        onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={
                          formData.payment_method === 'paypal' 
                            ? 'PayPal email address'
                            : formData.payment_method === 'bank_transfer'
                            ? 'Account number or routing info'
                            : 'Payment details'
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.payment_method === 'paypal' && 'Enter your PayPal email address'}
                        {formData.payment_method === 'bank_transfer' && 'Enter your bank account details'}
                        {formData.payment_method === 'venmo' && 'Enter your Venmo username'}
                        {formData.payment_method === 'zelle' && 'Enter your Zelle email or phone'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setError('');
                        setFormData({ amount: '', payment_method: 'paypal', payment_details: '' });
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Withdrawal History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Withdrawal History</h2>
              </div>
              {withdrawals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No withdrawal requests yet
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-lg font-bold text-gray-800">
                              ${withdrawal.amount.toFixed(2)}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(withdrawal.status)}`}>
                              {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div>Method: {withdrawal.payment_method.replace('_', ' ').toUpperCase()}</div>
                            <div>Requested: {new Date(withdrawal.requested_at).toLocaleString()}</div>
                            {withdrawal.processed_at && (
                              <div>Processed: {new Date(withdrawal.processed_at).toLocaleString()}</div>
                            )}
                            {withdrawal.processed_by_name && (
                              <div>Processed by: {withdrawal.processed_by_name}</div>
                            )}
                            {withdrawal.admin_notes && (
                              <div className="mt-2 text-gray-500 italic">
                                Note: {withdrawal.admin_notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Withdrawals;
