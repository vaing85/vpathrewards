import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import ReferralCode from '../components/ReferralCode';
import LazyImage from '../components/LazyImage';
import RecommendationWidget from '../components/RecommendationWidget';
import TierProgress from '../components/TierProgress';
import CashbackAlerts from '../components/CashbackAlerts';

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

interface BalanceInfo {
  total_earnings: number;
  pending_withdrawals: number;
  available_balance: number;
  min_withdrawal: number;
  can_withdraw: boolean;
}

interface TierBadge {
  plan: string;
  commission_share: number;
}

/** Tier → header gradient. Falls back to bronze for unknown tiers. */
const TIER_GRADIENTS: Record<string, string> = {
  bronze: 'from-amber-500 via-amber-600 to-amber-700',
  silver: 'from-slate-400 via-slate-500 to-slate-600',
  gold: 'from-yellow-500 via-amber-500 to-orange-500',
  platinum: 'from-slate-700 via-slate-800 to-slate-900',
  diamond: 'from-violet-500 via-fuchsia-500 to-pink-500',
};

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [tier, setTier] = useState<TierBadge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      // Use allSettled so a single endpoint failing doesn't blank the whole page.
      const [txRes, balanceRes, tierRes] = await Promise.allSettled([
        apiClient.get('/cashback/transactions', { params: { page: 1, limit: 5 } }),
        apiClient.get('/withdrawals/balance/available'),
        apiClient.get('/subscriptions/status'),
      ]);

      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data?.data ?? txRes.value.data ?? [];
        setTransactions(Array.isArray(data) ? data : []);
      }

      if (balanceRes.status === 'fulfilled') {
        setBalance(balanceRes.value.data);
      }

      if (tierRes.status === 'fulfilled') {
        const t = tierRes.value.data;
        setTier({ plan: t.plan ?? 'bronze', commission_share: t.commission_share ?? 0 });
      }

      // Only surface an error if every call failed — partial is fine.
      if (
        txRes.status === 'rejected' &&
        balanceRes.status === 'rejected' &&
        tierRes.status === 'rejected'
      ) {
        setError('Failed to load dashboard data. Please refresh.');
      }

      setLoading(false);
    };

    fetchData();
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const firstName = user?.name?.split(' ')[0] ?? '';
  const tierKey = tier?.plan ?? 'bronze';
  const tierGradient = TIER_GRADIENTS[tierKey] ?? TIER_GRADIENTS.bronze;
  const available = balance?.available_balance ?? 0;
  const pending = balance?.pending_withdrawals ?? 0;
  const minWithdraw = balance?.min_withdrawal ?? 10;
  const canWithdraw = balance?.can_withdraw ?? false;
  const shortBy = Math.max(0, minWithdraw - available);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <div
          className={`bg-gradient-to-br ${tierGradient} text-white rounded-2xl p-6 sm:p-8 shadow-lg`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back{firstName && `, ${firstName}`} 👋
              </h1>
              <p className="text-white/80 mt-1 text-sm sm:text-base">
                Here's your cashback snapshot.
              </p>
            </div>
            {tier && (
              <div className="inline-flex self-start items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                <span>{tier.plan}</span>
                <span className="text-white/70">·</span>
                <span>keep {tier.commission_share}%</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-white/80 text-xs sm:text-sm uppercase tracking-wider">
                Available to withdraw
              </div>
              <div className="text-4xl sm:text-5xl font-bold mt-1 tabular-nums">
                ${available.toFixed(2)}
              </div>
              {pending > 0 && (
                <div className="text-white/70 text-xs sm:text-sm mt-1">
                  + ${pending.toFixed(2)} pending
                </div>
              )}
              {!canWithdraw && shortBy > 0 && (
                <div className="text-white/80 text-sm mt-2">
                  ${shortBy.toFixed(2)} more to reach the ${minWithdraw.toFixed(0)} minimum
                </div>
              )}
            </div>
            <Link
              to={canWithdraw ? '/withdrawals' : '/'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white text-gray-900 hover:bg-gray-100 transition shadow-md"
            >
              {canWithdraw ? 'Withdraw' : 'Browse offers'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* ─── Tier progress ────────────────────────────────────────────── */}
        <TierProgress />

        {/* ─── Earn more (AI recommendations) ───────────────────────────── */}
        <RecommendationWidget />

        {/* ─── Recent activity ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent activity</h2>
            <Link
              to="/cashback-history"
              className="text-sm text-primary-600 hover:underline font-medium"
            >
              See all →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛍️</div>
              <p className="text-gray-700 font-medium mb-1">No cashback yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Click an offer to start earning on your first purchase.
              </p>
              <Link
                to="/"
                className="inline-block text-primary-600 hover:text-primary-700 font-semibold"
              >
                Browse offers →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <li key={tx.id} className="py-3 flex items-center gap-4">
                  {tx.merchant_logo ? (
                    <LazyImage
                      src={tx.merchant_logo}
                      alt={tx.merchant_name}
                      className="w-10 h-10 object-contain rounded-lg bg-gray-50 flex-shrink-0"
                      width={40}
                      height={40}
                      fallback="https://via.placeholder.com/40"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                      🛒
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {tx.merchant_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {tx.cashback_rate}% cashback ·{' '}
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-emerald-600 tabular-nums">
                      +${tx.amount.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs capitalize ${
                        tx.status === 'confirmed'
                          ? 'text-emerald-600'
                          : tx.status === 'pending'
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {tx.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ─── Cashback alerts ──────────────────────────────────────────── */}
        <CashbackAlerts />

        {/* ─── Invite friends ───────────────────────────────────────────── */}
        <ReferralCode />
      </div>
    </div>
  );
};

export default Dashboard;
