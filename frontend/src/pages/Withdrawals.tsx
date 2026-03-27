import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

interface StripeStatus {
  connected: boolean;
  ready: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paypal:       'PayPal',
  bank_transfer: 'Bank Transfer (Stripe)',
  venmo:        'Venmo',
  cash_app:     'Cash App',
};

const Withdrawals = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
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
    fetchStripeStatus();
    // If returning from Stripe onboarding, refresh status
    if (searchParams.get('stripe_connected') || searchParams.get('stripe_refresh')) {
      fetchStripeStatus();
    }
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

  const fetchStripeStatus = async () => {
    try {
      const res = await apiClient.get('/stripe/connect/status');
      setStripeStatus(res.data);
    } catch {
      // Stripe Connect not available — non-fatal
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await apiClient.post('/stripe/connect/account-link');
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start bank account setup');
      setConnectingStripe(false);
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

            {/* Stripe Connect banner */}
            {stripeStatus && !stripeStatus.ready && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-800">Connect your bank account for instant payouts</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {stripeStatus.connected
                      ? 'Your Stripe account setup is incomplete. Click to finish.'
                      : 'Link your bank account via Stripe to request bank transfer withdrawals.'}
                  </p>
                </div>
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {connectingStripe ? 'Redirecting...' : stripeStatus.connected ? 'Finish Setup' : 'Connect Bank'}
                </button>
              </div>
            )}
            {stripeStatus?.ready && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm text-green-800">
                ✓ Bank account connected via Stripe — bank transfer withdrawals are available.
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
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value, payment_details: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="paypal">PayPal</option>
                        <option value="bank_transfer" disabled={!stripeStatus?.ready}>
                          Bank Transfer (Stripe){!stripeStatus?.ready ? ' — connect bank first' : ''}
                        </option>
                        <option value="venmo">Venmo</option>
                        <option value="cash_app">Cash App</option>
                      </select>
                    </div>

                    {/* Bank transfer — no details needed, uses Stripe Connect */}
                    {formData.payment_method === 'bank_transfer' ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-700">
                        Payout will be sent to your connected Stripe bank account automatically.
                      </div>
                    ) : (
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
                            formData.payment_method === 'paypal'   ? 'PayPal email address' :
                            formData.payment_method === 'venmo'    ? 'Venmo username (e.g. @username)' :
                            formData.payment_method === 'cash_app' ? 'Cash App $cashtag (e.g. $username)' :
                            'Payment details'
                          }
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {formData.payment_method === 'paypal'   && 'PayPal and Venmo payouts are processed manually by admin within 1–3 business days.'}
                          {formData.payment_method === 'venmo'    && 'PayPal and Venmo payouts are processed manually by admin within 1–3 business days.'}
                          {formData.payment_method === 'cash_app' && 'Cash App payouts are processed manually by admin within 1–3 business days.'}
                        </p>
                      </div>
                    )}
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
                            <div>Method: {PAYMENT_METHOD_LABELS[withdrawal.payment_method] ?? withdrawal.payment_method}</div>
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
