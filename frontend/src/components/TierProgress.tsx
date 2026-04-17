import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

interface SubStatus {
  plan: string;
  status: string;
  cashback_bonus: number;
  next_plan: string | null;
  next_plan_price: number | null;
}

const TIER_COLORS: Record<string, string> = {
  free: 'from-gray-400 to-gray-500',
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-slate-400 to-slate-500',
  gold: 'from-yellow-400 to-yellow-500',
  platinum: 'from-violet-500 to-violet-700',
};

const TIER_ORDER = ['free', 'bronze', 'silver', 'gold', 'platinum'];

export default function TierProgress() {
  const [sub, setSub] = useState<SubStatus | null>(null);

  useEffect(() => {
    apiClient.get('/subscriptions/status')
      .then(({ data }) => setSub(data))
      .catch(() => {});
  }, []);

  if (!sub) return null;

  const currentIdx = TIER_ORDER.indexOf(sub.plan);
  const progress = ((currentIdx) / (TIER_ORDER.length - 1)) * 100;
  const gradient = TIER_COLORS[sub.plan] || TIER_COLORS.free;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-gray-800">Membership Tier</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sub.cashback_bonus > 0 ? `+${sub.cashback_bonus}% cashback bonus` : 'Standard cashback rates'}
          </p>
        </div>
        <span className={`bg-gradient-to-r ${gradient} text-white text-sm font-bold px-3 py-1 rounded-full capitalize`}>
          {sub.plan}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mt-4">
        <div
          className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 rounded-full`}
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>

      {/* Tier labels */}
      <div className="flex justify-between mt-2">
        {TIER_ORDER.map((t, i) => (
          <span
            key={t}
            className={`text-xs capitalize ${i <= currentIdx ? 'text-gray-700 font-medium' : 'text-gray-300'}`}
          >
            {t}
          </span>
        ))}
      </div>

      {sub.next_plan && (
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-600">
            Upgrade to <span className="font-semibold capitalize">{sub.next_plan}</span> for more cashback
          </p>
          <Link
            to="/profile"
            className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap ml-3"
          >
            Upgrade →
          </Link>
        </div>
      )}
    </div>
  );
}
