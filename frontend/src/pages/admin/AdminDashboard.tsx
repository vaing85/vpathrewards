import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

interface DashboardStats {
  users: { total: number };
  merchants: { total: number };
  offers: { total: number; active: number };
  transactions: { total: number; pending: number; confirmed: number };
  earnings: {
    total_user_earnings: number;
    total_cashback_paid: number;
    total_cashback_pending: number;
    total_your_revenue: number;
  };
}

interface RecentTransaction {
  id: number;
  amount: number;
  status: string;
  transaction_date: string;
  user_email: string;
  user_name: string;
  merchant_name: string;
  offer_title: string;
}

const AdminDashboard = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, transactionsRes] = await Promise.all([
          apiClient.get('/admin/dashboard/stats'),
          apiClient.get('/admin/dashboard/recent-transactions'),
        ]);
        setStats(statsRes.data);
        setRecentTransactions(transactionsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">Loading...</div>
    );
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h1>

        {/* Overview — 2 rows × 4 columns */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Row 1 — Site metrics */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Users</div>
              <div className="text-3xl font-bold text-primary-600">{stats.users.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Merchants</div>
              <div className="text-3xl font-bold text-blue-600">{stats.merchants.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Active Offers</div>
              <div className="text-3xl font-bold text-indigo-600">{stats.offers.active}
                <span className="text-sm font-normal text-gray-400"> / {stats.offers.total}</span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Transactions</div>
              <div className="text-3xl font-bold text-purple-600">{stats.transactions.total}</div>
              <div className="text-xs text-yellow-600 mt-0.5">{stats.transactions.pending} pending</div>
            </div>
            {/* Row 2 — Financial metrics */}
            <div className="bg-white rounded-lg shadow p-5 border-t-4 border-green-500">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Your Revenue</div>
              <div className="text-3xl font-bold text-green-600">${(stats.earnings.total_your_revenue || 0).toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-0.5">Commission − cashback</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-t-4 border-primary-400">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">User Earnings</div>
              <div className="text-3xl font-bold text-primary-600">${stats.earnings.total_user_earnings.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-t-4 border-blue-400">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Cashback Paid</div>
              <div className="text-3xl font-bold text-blue-600">${stats.earnings.total_cashback_paid.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-t-4 border-yellow-400">
              <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Cashback Pending</div>
              <div className="text-3xl font-bold text-yellow-600">${stats.earnings.total_cashback_pending.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Recent Transactions</h2>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{transaction.merchant_name}</div>
                      <div className="text-sm text-gray-500">
                        {transaction.user_name} ({transaction.user_email})
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(transaction.transaction_date).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary-600">
                        ${transaction.amount.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          transaction.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
