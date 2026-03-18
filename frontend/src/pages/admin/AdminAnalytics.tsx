import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

interface AnalyticsOverview {
  clicks: {
    total_clicks: number;
    unique_users: number;
    unique_offers: number;
    converted_clicks: number;
  };
  conversions: {
    total_conversions: number;
    total_revenue: number;
    total_commissions: number;
    avg_commission: number;
  };
  top_offers: any[];
  top_merchants: any[];
}

const AdminAnalytics = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);


  const [revenue, setRevenue] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [daysFilter, setDaysFilter] = useState(30);

  const fetchData = async () => {
    try {
      const [overviewRes, revenueRes, engagementRes] = await Promise.all([
        apiClient.get('/admin/analytics/overview'),
        apiClient.get('/analytics/revenue', { params: { days: daysFilter } }),
        apiClient.get('/analytics/engagement', { params: { days: daysFilter } }),
      ]);
      setOverview(overviewRes.data);
      setRevenue(revenueRes.data);
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

  const conversionRate = overview?.clicks.total_clicks 
    ? ((overview.clicks.converted_clicks / overview.clicks.total_clicks) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Analytics Overview</h1>
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

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : overview ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm mb-1">Total Clicks</div>
                <div className="text-3xl font-bold text-primary-600">
                  {overview.clicks.total_clicks}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {overview.clicks.unique_users} unique users
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm mb-1">Conversions</div>
                <div className="text-3xl font-bold text-green-600">
                  {overview.conversions.total_conversions}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {conversionRate}% conversion rate
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
                <div className="text-3xl font-bold text-blue-600">
                  ${overview.conversions.total_revenue?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  From orders
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm mb-1">Total Commissions</div>
                <div className="text-3xl font-bold text-purple-600">
                  ${overview.conversions.total_commissions?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: ${overview.conversions.avg_commission?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            {/* Revenue Analytics */}
            {revenue && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ${(revenue.overall?.total_revenue || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {revenue.overall?.total_conversions || 0} conversions
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Total Commissions</div>
                  <div className="text-3xl font-bold text-green-600">
                    ${(revenue.overall?.total_commission || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg: ${(revenue.overall?.avg_commission || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-gray-600 text-sm mb-1">Avg Order Value</div>
                  <div className="text-3xl font-bold text-purple-600">
                    ${(revenue.overall?.avg_order_value || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Min: ${(revenue.overall?.min_order || 0).toFixed(2)} | Max: ${(revenue.overall?.max_order || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Metrics */}
            {engagement && (
              <div className="bg-white rounded-lg shadow mb-8 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">User Engagement</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Active Users</div>
                    <div className="text-2xl font-bold text-primary-600">{engagement.active_users || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Last {engagement.period_days} days</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Returning Users</div>
                    <div className="text-2xl font-bold text-green-600">{engagement.returning_users || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">Users who came back</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-sm mb-1">Daily Activity</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {engagement.activity_breakdown?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active days</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Offers */}
            {overview.top_offers.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Top Performing Offers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overview.top_offers.map((offer) => (
                        <tr key={offer.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {offer.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {offer.merchant_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {offer.click_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {offer.conversion_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            ${(offer.total_commission || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Merchants */}
            {overview.top_merchants.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Top Performing Merchants</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overview.top_merchants.map((merchant) => (
                        <tr key={merchant.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {merchant.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {merchant.click_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {merchant.conversion_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            ${(merchant.total_commission || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">No analytics data available</div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
