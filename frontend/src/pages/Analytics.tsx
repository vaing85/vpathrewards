import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import LazyImage from '../components/LazyImage';

interface Click {
  id: number;
  offer_id: number;
  offer_title: string;
  merchant_name: string;
  clicked_at: string;
  converted: number;
  cashback_rate: number;
}

interface Conversion {
  id: number;
  offer_id: number;
  offer_title: string;
  merchant_name: string;
  order_amount: number;
  commission_amount: number;
  status: string;
  conversion_date: string;
}

interface PopularItem {
  id: number;
  title?: string;
  name?: string;
  merchant_name?: string;
  merchant_logo?: string;
  cashback_rate?: number;
  click_count: number;
  conversion_count: number;
  total_commission: number;
  unique_users: number;
}

interface ConversionRate {
  period: string;
  total_clicks: number;
  conversions: number;
  conversion_rate: number;
  total_commission: number;
}

interface Engagement {
  period_days: number;
  active_users: number;
  activity_breakdown: Array<{ date: string; clicks: number; active_users: number }>;
  top_users: Array<{ id: number; name: string; email: string; click_count: number; conversion_count: number; total_earned: number }>;
}

const Analytics = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [clicks, setClicks] = useState<Click[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [popular, setPopular] = useState<{ offers?: PopularItem[]; merchants?: PopularItem[] }>({});
  const [conversionRates, setConversionRates] = useState<{ overall: any; breakdown: ConversionRate[] } | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'clicks' | 'conversions' | 'popular' | 'trends'>('overview');
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      const [clicksRes, conversionsRes, popularRes, conversionRatesRes, engagementRes] = await Promise.all([
        apiClient.get('/tracking/analytics/clicks'),
        apiClient.get('/tracking/analytics/conversions'),
        apiClient.get('/analytics/popular', { params: { days: daysFilter, limit: 10 } }),
        apiClient.get('/analytics/conversion-rates', { params: { days: daysFilter } }),
        apiClient.get('/analytics/engagement', { params: { days: daysFilter } }),
      ]);
      setClicks(clicksRes.data);
      setConversions(conversionsRes.data);
      setPopular(popularRes.data);
      setConversionRates(conversionRatesRes.data);
      setEngagement(engagementRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, daysFilter]);

  if (!isAuthenticated) return null;

  const totalClicks = clicks.length;
  const totalConversions = conversions.length;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00';
  const totalEarnings = conversions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Analytics</h1>
          <div className="flex items-center space-x-4">
            <label className="text-sm text-gray-600">Period:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Clicks</div>
            <div className="text-3xl font-bold text-primary-600">{totalClicks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Conversions</div>
            <div className="text-3xl font-bold text-green-600">{totalConversions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Conversion Rate</div>
            <div className="text-3xl font-bold text-blue-600">{conversionRate}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-purple-600">${totalEarnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('popular')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'popular'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Popular
              </button>
              <button
                onClick={() => setActiveTab('trends')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'trends'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Trends
              </button>
              <button
                onClick={() => setActiveTab('clicks')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'clicks'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Clicks ({clicks.length})
              </button>
              <button
                onClick={() => setActiveTab('conversions')}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'conversions'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Conversions ({conversions.length})
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : (
                <div className="space-y-6">
                  {/* Engagement Stats */}
                  {engagement && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
                        <div className="text-sm opacity-90 mb-1">Active Users</div>
                        <div className="text-3xl font-bold">{engagement.active_users}</div>
                        <div className="text-sm opacity-75 mt-1">Last {engagement.period_days} days</div>
                      </div>
                      {conversionRates && (
                        <>
                          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
                            <div className="text-sm opacity-90 mb-1">Overall Conversion Rate</div>
                            <div className="text-3xl font-bold">{conversionRates.overall?.conversion_rate || 0}%</div>
                            <div className="text-sm opacity-75 mt-1">{conversionRates.overall?.conversions || 0} / {conversionRates.overall?.total_clicks || 0} clicks</div>
                          </div>
                          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
                            <div className="text-sm opacity-90 mb-1">Total Earnings</div>
                            <div className="text-3xl font-bold">${totalEarnings.toFixed(2)}</div>
                            <div className="text-sm opacity-75 mt-1">From {totalConversions} conversions</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-600 text-xs mb-1">Total Clicks</div>
                      <div className="text-2xl font-bold text-primary-600">{totalClicks}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-600 text-xs mb-1">Conversions</div>
                      <div className="text-2xl font-bold text-green-600">{totalConversions}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-600 text-xs mb-1">Conversion Rate</div>
                      <div className="text-2xl font-bold text-blue-600">{conversionRate}%</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="text-gray-600 text-xs mb-1">Total Earnings</div>
                      <div className="text-2xl font-bold text-purple-600">${totalEarnings.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Top Performing Offers */}
                  {popular.offers && popular.offers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Offers</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {popular.offers.slice(0, 5).map((offer) => (
                          <div key={offer.id} className="flex items-center justify-between bg-white p-3 rounded">
                            <div className="flex items-center space-x-3">
                              {offer.merchant_logo && (
                                <LazyImage src={offer.merchant_logo} alt={offer.merchant_name || 'Merchant'} className="w-8 h-8 object-contain" width={32} height={32} fallback="https://placehold.co/32" />
                              )}
                              <div>
                                <div className="font-medium text-sm">{offer.merchant_name}</div>
                                <div className="text-xs text-gray-500">{offer.title}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{offer.click_count} clicks</div>
                              <div className="text-xs text-gray-500">{offer.conversion_count} conversions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Popular Tab */}
          {activeTab === 'popular' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : (
                <div className="space-y-6">
                  {/* Popular Offers */}
                  {popular.offers && popular.offers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Offers</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {popular.offers.map((offer) => (
                              <tr key={offer.id}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    {offer.merchant_logo && (
                                      <img src={offer.merchant_logo} alt={offer.merchant_name} className="w-6 h-6 object-contain" />
                                    )}
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{offer.merchant_name}</div>
                                      <div className="text-xs text-gray-500">{offer.title}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{offer.click_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{offer.conversion_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{offer.unique_users}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600">${(offer.total_commission || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Popular Merchants */}
                  {popular.merchants && popular.merchants.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Merchants</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {popular.merchants.map((merchant: any) => (
                              <tr key={merchant.id}>
                                <td className="px-4 py-3">
                                  <Link to={`/merchants/${merchant.id}`} className="flex items-center space-x-2 hover:text-primary-600">
                                    {merchant.logo_url && (
                                      <LazyImage src={merchant.logo_url} alt={merchant.name} className="w-6 h-6 object-contain" width={24} height={24} fallback="https://placehold.co/24" />
                                    )}
                                    <div className="text-sm font-medium">{merchant.name}</div>
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{merchant.click_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{merchant.conversion_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{merchant.unique_users}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600">${(merchant.total_commission || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : conversionRates && conversionRates.breakdown.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversion Rate Trends</h3>
                    <div className="space-y-3">
                      {conversionRates.breakdown.slice(0, 10).map((rate) => (
                        <div key={rate.period} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{rate.period}</span>
                              <span className="text-sm font-semibold text-primary-600">{rate.conversion_rate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-600 h-2 rounded-full"
                                style={{ width: `${Math.min(rate.conversion_rate, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {rate.conversions} conversions / {rate.total_clicks} clicks
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {engagement && engagement.activity_breakdown.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Activity</h3>
                      <div className="space-y-2">
                        {engagement.activity_breakdown.slice(0, 10).map((activity) => (
                          <div key={activity.date} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{new Date(activity.date).toLocaleDateString()}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-gray-500">{activity.active_users} users</span>
                              <span className="text-gray-500">{activity.clicks} clicks</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">No trend data available</div>
              )}
            </div>
          )}

          {/* Clicks Tab */}
          {activeTab === 'clicks' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : clicks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No clicks tracked yet. Start clicking on offers to see your activity here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashback</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicked</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clicks.map((click) => (
                        <tr key={click.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {click.merchant_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{click.offer_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                            {click.cashback_rate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(click.clicked_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {click.converted === 1 ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                Converted
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Conversions Tab */}
          {activeTab === 'conversions' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">Loading...</div>
              ) : conversions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No conversions yet. Keep shopping through our offers!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {conversions.map((conversion) => (
                        <tr key={conversion.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {conversion.merchant_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${conversion.order_amount?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            ${conversion.commission_amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(conversion.conversion_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                conversion.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {conversion.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
