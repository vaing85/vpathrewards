import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface InsightData {
  summary: string;
  generated_at: string;
  cached: boolean;
  stats: {
    total_users: number;
    new_users_7d: number;
    total_cashback: number;
    cashback_7d: number;
    pending_withdrawals: number;
    pending_amount: number;
    active_offers: number;
  } | null;
}

export default function AIInsights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await apiClient.get('/admin/insights');
      setData(data);
    } catch {
      setError('Could not load AI insights. Make sure ANTHROPIC_API_KEY is configured.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="font-semibold text-gray-800">AI Platform Insights</h2>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-gray-400">
              {data.cached ? 'Cached · ' : ''}
              {new Date(data.generated_at).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-3 bg-gray-100 rounded ${i === 3 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && !loading && (
        <>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.summary}</p>
          {data.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
              <Stat label="Total Users" value={data.stats.total_users.toLocaleString()} sub={`+${data.stats.new_users_7d} this week`} />
              <Stat label="Cashback Paid" value={`$${data.stats.total_cashback.toFixed(0)}`} sub={`$${data.stats.cashback_7d.toFixed(0)} this week`} />
              <Stat label="Pending Payouts" value={data.stats.pending_withdrawals.toString()} sub={`$${data.stats.pending_amount.toFixed(0)} total`} />
              <Stat label="Active Offers" value={data.stats.active_offers.toString()} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
