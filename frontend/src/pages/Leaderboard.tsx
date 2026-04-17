import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Entry { name: string; total_earnings: number; monthly_earnings?: number; subscription_plan: string; }
interface MeStatus { opted_in: boolean; rank: number | null; }

const PLAN_BADGE: Record<string, string> = {
  platinum: 'bg-violet-100 text-violet-700',
  gold: 'bg-yellow-100 text-yellow-700',
  silver: 'bg-slate-100 text-slate-600',
  bronze: 'bg-amber-100 text-amber-700',
  free: 'bg-gray-100 text-gray-500',
};

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'monthly' | 'all_time'>('monthly');
  const [data, setData] = useState<{ monthly: Entry[]; all_time: Entry[] } | null>(null);
  const [me, setMe] = useState<MeStatus | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    apiClient.get('/leaderboard').then(({ data }) => setData(data)).catch(() => {});
    if (isAuthenticated) {
      apiClient.get('/leaderboard/me').then(({ data }) => setMe(data)).catch(() => {});
    }
  }, [isAuthenticated]);

  const toggleOptIn = async () => {
    setToggling(true);
    try {
      const { data } = await apiClient.post('/leaderboard/optin');
      setMe((prev) => ({ ...prev!, opted_in: data.opted_in }));
    } catch (_) {}
    finally { setToggling(false); }
  };

  const entries = data ? (tab === 'monthly' ? data.monthly : data.all_time) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">Top earners on V PATHing Rewards</p>
        </div>
        {isAuthenticated && me && (
          <div className="text-right">
            {me.opted_in && me.rank && (
              <p className="text-sm text-gray-600 mb-1">Your rank: <span className="font-bold">#{me.rank}</span></p>
            )}
            <button
              onClick={toggleOptIn}
              disabled={toggling}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                me.opted_in
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {toggling ? '…' : me.opted_in ? 'Leave leaderboard' : 'Join leaderboard'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {(['monthly', 'all_time'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'monthly' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="font-medium text-gray-600">No entries yet</p>
          <p className="text-sm mt-1">Be the first to join the leaderboard!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li
              key={i}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition ${
                i < 3 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-100' : 'bg-white border-gray-100'
              }`}
            >
              <span className="text-xl w-8 text-center">{medals[i] ?? `#${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{entry.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_BADGE[entry.subscription_plan] ?? PLAN_BADGE.free}`}>
                  {entry.subscription_plan}
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">
                  ${tab === 'monthly'
                    ? (entry.monthly_earnings ?? 0).toFixed(2)
                    : entry.total_earnings.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{tab === 'monthly' ? 'this month' : 'all time'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
