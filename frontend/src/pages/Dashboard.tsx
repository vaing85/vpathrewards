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

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  rejected:  'bg-red-100 text-red-700',
};

const QUICK_LINKS = [
  { to: '/withdrawals',      label: 'Withdraw',        icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-primary-50 text-primary-700' },
  { to: '/cashback-history', label: 'History',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'bg-blue-50 text-blue-700' },
  { to: '/referrals',        label: 'Referrals',       icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-purple-50 text-purple-700' },
  { to: '/analytics',        label: 'Analytics',       icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'bg-green-50 text-green-700' },
];

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [pagination, setPagination]     = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }

    const fetchData = async () => {
      try {
        const [txRes, sumRes] = await Promise.all([
          apiClient.get('/cashback/transactions', { params: { page: currentPage, limit: 10 } }),
          apiClient.get('/cashback/summary'),
        ]);
        if (txRes.data?.data) {
          setTransactions(txRes.data.data);
          setPagination(txRes.data.pagination);
        } else {
          setTransactions(txRes.data || []);
        }
        setSummary(sumRes.data || { total_earnings: 0, total_transactions: 0, pending_earnings: 0, confirmed_earnings: 0 });
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
        setTransactions([]);
        setSummary({ total_earnings: 0, total_transactions: 0, pending_earnings: 0, confirmed_earnings: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate, currentPage]);

  if (!isAuthenticated) return null;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your earnings summary</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Earnings',  value: `$${((summary?.total_earnings) || 0).toFixed(2)}`,    color: 'text-primary-600' },
            { label: 'Confirmed',       value: `$${((summary?.confirmed_earnings) || 0).toFixed(2)}`, color: 'text-green-600' },
            { label: 'Pending',         value: `$${((summary?.pending_earnings) || 0).toFixed(2)}`,   color: 'text-yellow-600' },
            { label: 'Transactions',    value: summary?.total_transactions ?? 0,                       color: 'text-gray-800' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <div className="text-xs text-gray-500 mb-1">{card.label}</div>
              {loading
                ? <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
                : <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              }
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium transition hover:opacity-80 ${link.color}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Transactions</h2>
            <Link to="/cashback-history" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-3">No transactions yet.</p>
              <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">Browse offers to start earning →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map(t => (
                <div key={t.id} className="px-5 py-4 hover:bg-gray-50 flex items-center gap-4">
                  {t.merchant_logo ? (
                    <LazyImage
                      src={t.merchant_logo}
                      alt={t.merchant_name}
                      className="w-10 h-10 object-contain rounded-lg flex-shrink-0"
                      width={40} height={40}
                      fallback=""
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm truncate">{t.merchant_name}</div>
                    <div className="text-xs text-gray-400 truncate">{t.offer_title}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-primary-600 text-sm">+${parseFloat(String(t.amount)).toFixed(2)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                totalItems={pagination.total}
              />
            </div>
          )}
        </div>

        {/* Referral Code */}
        <ReferralCode />
      </div>
    </div>
  );
};

export default Dashboard;
