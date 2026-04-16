import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

interface ReferredUser {
  id: number;
  name: string;
  email: string;
  total_earnings: number;
  referred_at: string;
  transaction_count: number;
  total_earned: number;
  referral_bonus_earned: number;
}

interface ReferralEarning {
  id: number;
  referred_user_name: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_amount: number;
  offer_title?: string;
  merchant_name?: string;
}

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  referred_users: ReferredUser[];
}

const ReferralDashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [earnings, setEarnings] = useState<ReferralEarning[]>([]);
  const [referralCode, setReferralCode] = useState<{ referral_code: string; referral_link: string; total_referrals: number; total_earnings: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'referrals'>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, earningsRes, codeRes] = await Promise.all([
        apiClient.get('/referrals/dashboard'),
        apiClient.get('/referrals/earnings'),
        apiClient.get('/referrals/code'),
      ]);
      setStats(statsRes.data);
      setEarnings(earningsRes.data);
      setReferralCode(codeRes.data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralCode?.referral_link) {
      navigator.clipboard.writeText(referralCode.referral_link);
      alert('Referral link copied to clipboard!');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Referral Dashboard</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Referral Code Section */}
            {referralCode && (
              <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Your Referral Code</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-white bg-opacity-20 rounded-lg px-4 py-3">
                    <div className="text-sm opacity-90 mb-1">Referral Code</div>
                    <div className="text-2xl font-bold">{referralCode.referral_code}</div>
                  </div>
                  <div className="flex-1 bg-white bg-opacity-20 rounded-lg px-4 py-3">
                    <div className="text-sm opacity-90 mb-1">Referral Link</div>
                    <div className="text-sm break-all">{referralCode.referral_link}</div>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
                  >
                    Copy Link
                  </button>
                </div>
                <p className="mt-4 text-sm opacity-90">
                  Share your referral link and earn 10% of your referrals' cashback earnings!
                </p>
              </div>
            )}

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Total Referrals</div>
                  <div className="text-3xl font-bold text-primary-600">{stats.total_referrals}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Active Referrals</div>
                  <div className="text-3xl font-bold text-green-600">{stats.active_referrals}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Total Earnings</div>
                  <div className="text-3xl font-bold text-purple-600">${stats.total_earnings.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Pending Earnings</div>
                  <div className="text-3xl font-bold text-yellow-600">${stats.pending_earnings.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('earnings')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'earnings'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Earnings History
                  </button>
                  <button
                    onClick={() => setActiveTab('referrals')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'referrals'
                        ? 'border-b-2 border-primary-500 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Referred Users
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">How It Works</h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="font-semibold">Share Your Link</h4>
                          <p className="text-gray-600">Share your unique referral link with friends and family</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="font-semibold">They Sign Up</h4>
                          <p className="text-gray-600">When they register using your link, they become your referral</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h4 className="font-semibold">Earn 10% Bonus</h4>
                          <p className="text-gray-600">You earn 10% of all cashback your referrals earn</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Earnings Tab */}
                {activeTab === 'earnings' && (
                  <div>
                    {earnings.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No referral earnings yet. Start referring friends to earn bonuses!
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referred User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {earnings.map((earning) => (
                              <tr key={earning.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {earning.referred_user_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {earning.merchant_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  ${earning.transaction_amount?.toFixed(2) || '0.00'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  ${earning.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      earning.status === 'confirmed'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {earning.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(earning.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && stats && (
                  <div>
                    {stats.referred_users.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No referrals yet. Share your link to start earning!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {stats.referred_users.map((user) => (
                          <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{user.name}</h4>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Referred: {new Date(user.referred_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600 mb-1">
                                  <span className="font-semibold">${user.total_earned.toFixed(2)}</span> earned
                                </div>
                                <div className="text-sm text-primary-600 mb-1">
                                  <span className="font-semibold">${user.referral_bonus_earned.toFixed(2)}</span> your bonus
                                </div>
                                <div className="text-xs text-gray-500">
                                  {user.transaction_count} transactions
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReferralDashboard;
