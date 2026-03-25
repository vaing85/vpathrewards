import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import LazyImage from '../components/LazyImage';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface TimeSeriesData {
  period: string;
  transaction_count: number;
  total_amount: number;
  confirmed_amount: number;
  pending_amount: number;
}

interface MerchantData {
  id: number;
  name: string;
  logo_url?: string;
  transaction_count: number;
  total_amount: number;
  avg_amount: number;
}

interface CategoryData {
  category: string;
  transaction_count: number;
  total_amount: number;
}

interface CalendarData {
  date: string;
  transaction_count: number;
  total_amount: number;
  confirmed_amount: number;
  pending_amount: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const CashbackHistory = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [byMerchant, setByMerchant] = useState<MerchantData[]>([]);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'categories' | 'calendar' | 'goals'>('overview');
  const [goals, setGoals] = useState<any[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    target_amount: '',
    period_type: 'monthly',
    start_date: '',
    end_date: ''
  });
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [daysFilter, setDaysFilter] = useState(30);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchData();
    if (activeTab === 'goals') {
      fetchGoals();
    }
  }, [isAuthenticated, navigate, groupBy, daysFilter, statusFilter, activeTab]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'calendar') {
      fetchCalendarData();
    }
  }, [isAuthenticated, activeTab, selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      const response = await apiClient.get('/cashback/history', {
        params: {
          group_by: groupBy,
          days: daysFilter,
          ...(statusFilter && { status: statusFilter })
        }
      });
      setTimeSeries(response.data.time_series || []);
      setByMerchant(response.data.by_merchant || []);
      setByCategory(response.data.by_category || []);
    } catch (error) {
      console.error('Error fetching cashback history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const response = await apiClient.get('/cashback/calendar', {
        params: {
          year: selectedYear,
          month: selectedMonth
        }
      });
      setCalendarData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await apiClient.get('/cashback/goals');
      setGoals(response.data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/cashback/goals', goalForm);
      setShowGoalForm(false);
      setGoalForm({
        title: '',
        target_amount: '',
        period_type: 'monthly',
        start_date: '',
        end_date: ''
      });
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await apiClient.delete(`/cashback/goals/${id}`);
        fetchGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
  };

  if (!isAuthenticated) return null;

  // Calculate totals
  const totalEarnings = timeSeries.reduce((sum, item) => sum + item.total_amount, 0);
  const confirmedEarnings = timeSeries.reduce((sum, item) => sum + item.confirmed_amount, 0);
  const pendingEarnings = timeSeries.reduce((sum, item) => sum + item.pending_amount, 0);
  const totalTransactions = timeSeries.reduce((sum, item) => sum + item.transaction_count, 0);

  // Format date for display
  const formatDate = (period: string) => {
    if (groupBy === 'month') {
      return period;
    } else if (groupBy === 'week') {
      return period;
    } else {
      return new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getEarningsForDate = (day: number) => {
    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const data = calendarData.find(d => d.date === dateStr);
    return data ? data.total_amount : 0;
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Cashback History</h1>
          <div className="flex items-center space-x-4">
            {activeTab === 'overview' && (
              <>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
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
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </>
            )}
            {activeTab === 'calendar' && (
              <>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-primary-600">${totalEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Confirmed</div>
            <div className="text-3xl font-bold text-green-600">${confirmedEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">${pendingEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm mb-1">Transactions</div>
            <div className="text-3xl font-bold text-gray-800">{totalTransactions}</div>
          </div>
        </div>

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
                onClick={() => setActiveTab('merchants')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'merchants'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By Merchant
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'categories'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'calendar'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'goals'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Goals
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Earnings Over Time - Line Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Earnings Over Time</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={[...timeSeries].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                          <Legend />
                          <Line type="monotone" dataKey="total_amount" stroke="#3B82F6" strokeWidth={2} name="Total Earnings" />
                          <Line type="monotone" dataKey="confirmed_amount" stroke="#10B981" strokeWidth={2} name="Confirmed" />
                          <Line type="monotone" dataKey="pending_amount" stroke="#F59E0B" strokeWidth={2} name="Pending" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Earnings Over Time - Area Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Earnings</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={[...timeSeries].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                          <Legend />
                          <Area type="monotone" dataKey="total_amount" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Total Earnings" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Transaction Count - Bar Chart */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction Count</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={[...timeSeries].reverse()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="transaction_count" fill="#8B5CF6" name="Transactions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* By Merchant Tab */}
                {activeTab === 'merchants' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Earnings by Merchant</h3>
                    {byMerchant.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={byMerchant} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={150} />
                            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Legend />
                            <Bar dataKey="total_amount" fill="#3B82F6" name="Total Earnings" />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-6 space-y-2">
                          {byMerchant.map((merchant, index) => (
                            <div key={merchant.id} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                              <div className="flex items-center space-x-3">
                                {merchant.logo_url && (
                                  <LazyImage src={merchant.logo_url} alt={merchant.name} className="w-10 h-10 object-contain" width={40} height={40} fallback="https://placehold.co/40" />
                                )}
                                <div>
                                  <div className="font-medium">{merchant.name}</div>
                                  <div className="text-sm text-gray-500">{merchant.transaction_count} transactions</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-primary-600">${merchant.total_amount.toFixed(2)}</div>
                                <div className="text-sm text-gray-500">Avg: ${merchant.avg_amount.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">No merchant data available</div>
                    )}
                  </div>
                )}

                {/* By Category Tab */}
                {activeTab === 'categories' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Earnings by Category</h3>
                    {byCategory.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={byCategory}
                                dataKey="total_amount"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                              >
                                {byCategory.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {byCategory.map((category, index) => (
                              <div key={category.category} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  ></div>
                                  <div>
                                    <div className="font-medium">{category.category || 'Uncategorized'}</div>
                                    <div className="text-sm text-gray-500">{category.transaction_count} transactions</div>
                                  </div>
                                </div>
                                <div className="font-bold text-primary-600">${category.total_amount.toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">No category data available</div>
                    )}
                  </div>
                )}

                {/* Calendar Tab */}
                {activeTab === 'calendar' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: firstDay }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square"></div>
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const earnings = getEarningsForDate(day);
                        const hasEarnings = earnings > 0;
                        return (
                          <div
                            key={day}
                            className={`aspect-square border border-gray-200 rounded p-2 ${
                              hasEarnings ? 'bg-primary-50 border-primary-300' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-700">{day}</div>
                            {hasEarnings && (
                              <div className="text-xs font-semibold text-primary-600 mt-1">
                                ${earnings.toFixed(2)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      Total earnings this month: ${calendarData.reduce((sum, d) => sum + d.total_amount, 0).toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Goals Tab */}
                {activeTab === 'goals' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-800">Cashback Goals</h3>
                      <button
                        onClick={() => setShowGoalForm(!showGoalForm)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        {showGoalForm ? 'Cancel' : '+ New Goal'}
                      </button>
                    </div>

                    {showGoalForm && (
                      <form onSubmit={handleCreateGoal} className="bg-gray-50 p-6 rounded-lg mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
                            <input
                              type="text"
                              value={goalForm.title}
                              onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={goalForm.target_amount}
                              onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                            <select
                              value={goalForm.period_type}
                              onChange={(e) => setGoalForm({ ...goalForm, period_type: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                          {goalForm.period_type === 'custom' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={goalForm.start_date}
                                  onChange={(e) => setGoalForm({ ...goalForm, start_date: e.target.value })}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                  type="date"
                                  value={goalForm.end_date}
                                  onChange={(e) => setGoalForm({ ...goalForm, end_date: e.target.value })}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="mt-4 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition"
                        >
                          Create Goal
                        </button>
                      </form>
                    )}

                    {goals.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No goals set yet. Create a goal to track your cashback progress!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {goals.map((goal) => {
                          const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                          const isCompleted = goal.is_completed === 1;
                          return (
                            <div
                              key={goal.id}
                              className={`bg-white border-2 rounded-lg p-6 ${
                                isCompleted ? 'border-green-500' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-800">{goal.title}</h4>
                                  <p className="text-sm text-gray-500">
                                    {goal.period_type === 'monthly' ? 'Monthly Goal' : goal.period_type === 'yearly' ? 'Yearly Goal' : 'Custom Goal'}
                                  </p>
                                </div>
                                {isCompleted && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                    Completed
                                  </span>
                                )}
                              </div>
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-gray-600">
                                    ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                                  </span>
                                  <span className="text-sm font-semibold text-primary-600">
                                    {Math.min(progress, 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full transition-all ${
                                      isCompleted ? 'bg-green-500' : 'bg-primary-600'
                                    }`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                  ${(goal.target_amount - goal.current_amount).toFixed(2)} remaining
                                </span>
                                <button
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashbackHistory;
