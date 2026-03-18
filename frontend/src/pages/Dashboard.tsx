import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import ReferralCode from '../components/ReferralCode';
import Pagination from '../components/Pagination';
import LazyImage from '../components/LazyImage';

interface Transaction {
  id: number;
  amount: number;
  status: string;
  transaction_date: string;
  offer_title: string;
  cashback_rate: number;
  merchant_name: string;
  merchant_logo?: string;
}

interface Summary {
  total_earnings: number;
  total_transactions: number;
  pending_earnings: number;
  confirmed_earnings: number;
}

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [transactionsRes, summaryRes] = await Promise.all([
          apiClient.get('/cashback/transactions', { params: { page: currentPage, limit: 10 } }),
          apiClient.get('/cashback/summary'),
        ]);
        
        // Handle paginated response
        if (transactionsRes.data?.data) {
          setTransactions(transactionsRes.data.data);
          setPagination(transactionsRes.data.pagination);
        } else {
          // Fallback for non-paginated response
          setTransactions(transactionsRes.data || []);
          setPagination(null);
        }
        
        setSummary(summaryRes.data || {
          total_earnings: 0,
          total_transactions: 0,
          pending_earnings: 0,
          confirmed_earnings: 0
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.response?.data?.error || 'Failed to load dashboard data');
        // Set default values on error
        setTransactions([]);
        setSummary({
          total_earnings: 0,
          total_transactions: 0,
          pending_earnings: 0,
          confirmed_earnings: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate, currentPage]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex space-x-3">
            <Link
              to="/cashback-history"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Cashback History
            </Link>
            <Link
              to="/analytics"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition"
            >
              Analytics
            </Link>
            <Link
              to="/referrals"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              Referrals
            </Link>
            <Link
              to="/withdrawals"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
            >
              Withdraw Earnings
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-gray-600 text-xs sm:text-sm mb-1">Total Earnings</div>
            {loading ? (
              <div className="text-2xl sm:text-3xl font-bold text-gray-400">...</div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-primary-600">
                ${((summary?.total_earnings) || 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-gray-600 text-xs sm:text-sm mb-1">Confirmed</div>
            {loading ? (
              <div className="text-2xl sm:text-3xl font-bold text-gray-400">...</div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                ${((summary?.confirmed_earnings) || 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-gray-600 text-xs sm:text-sm mb-1">Pending</div>
            {loading ? (
              <div className="text-2xl sm:text-3xl font-bold text-gray-400">...</div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                ${((summary?.pending_earnings) || 0).toFixed(2)}
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-gray-600 text-xs sm:text-sm mb-1">Total Transactions</div>
            {loading ? (
              <div className="text-2xl sm:text-3xl font-bold text-gray-400">...</div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                {summary?.total_transactions || 0}
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Recent Transactions</h2>
          </div>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No transactions yet.</p>
              <a
                href="/"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Browse offers to start earning →
              </a>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      {transaction.merchant_logo && (
                        <LazyImage
                          src={transaction.merchant_logo}
                          alt={transaction.merchant_name}
                          className="w-12 h-12 object-contain rounded"
                          width={48}
                          height={48}
                          fallback="https://via.placeholder.com/48"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 truncate">
                          {transaction.merchant_name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {transaction.offer_title} • {transaction.cashback_rate}% cashback
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <div className="text-lg font-bold text-primary-600">
                        +${transaction.amount.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          transaction.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
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
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                totalItems={pagination.total}
              />
            </div>
          )}
        </div>

        {/* Referral Code Section */}
        <div className="mt-8">
          <ReferralCode />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
