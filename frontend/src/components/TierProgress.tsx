import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface TierStatus {
  plan: string;
  status: string;
  commission_share: number;
  lifetime_spend: number;
  next_plan: string | null;
  next_plan_threshold: number | null;
  amount_to_next_plan: number | null;
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-slate-400 to-slate-500',
  gold: 'from-yellow-400 to-yellow-500',
  platinum: 'from-slate-700 to-slate-900',
  diamond: 'from-violet-500 to-violet-700',
  emerald: 'from-emerald-400 to-emerald-600',
  sapphire: 'from-blue-500 to-blue-700',
  ruby: 'from-rose-500 to-red-700',
  obsidian: 'from-gray-800 to-black',
};

const TIER_ORDER = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'emerald',
  'sapphire',
  'ruby',
  'obsidian',
];

export default function TierProgress() {
  const [sub, setSub] = useState<TierStatus | null>(null);

  useEffect(() => {
    apiClient
      .get('/subscriptions/status')
      .then(({ data }) => setSub(data))
      .catch(() => {});
  }, []);

  if (!sub) return null;

  const currentIdx = Math.max(0, TIER_ORDER.indexOf(sub.plan));
  const progress = (currentIdx / (TIER_ORDER.length - 1)) * 100;
  const gradient = TIER_COLORS[sub.plan] || TIER_COLORS.bronze;
  const spend = sub.lifetime_spend || 0;
  const toNext = sub.amount_to_next_plan;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-gray-800">Membership Tier</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            You keep{' '}
            <span className="font-semibold text-gray-700">{sub.commission_share}%</span> of the
            commission on every purchase
          </p>
        </div>
        <span
          className={`bg-gradient-to-r ${gradient} text-white text-sm font-bold px-3 py-1 rounded-full capitalize`}
        >
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
            className={`text-xs capitalize ${
              i <= currentIdx ? 'text-gray-700 font-medium' : 'text-gray-300'
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Lifetime confirmed spend */}
      <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">${spend.toFixed(2)}</span> in lifetime
          confirmed spend
        </p>
      </div>

      {/* Next tier nudge */}
      {sub.next_plan && toNext != null && toNext > 0 && (
        <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-sm text-emerald-800">
            Spend <span className="font-semibold">${toNext.toFixed(2)}</span> more to reach{' '}
            <span className="font-semibold capitalize">{sub.next_plan}</span> and keep a bigger
            share of every commission.
          </p>
        </div>
      )}

      {!sub.next_plan && (
        <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">
            You've reached the top tier — you keep the maximum {sub.commission_share}% share on
            every purchase.
          </p>
        </div>
      )}
    </div>
  );
}
