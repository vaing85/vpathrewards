import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface TierPlan {
  key: string;
  name: string;
  commission_share: number;
  spend_threshold: number;
  description: string;
}

interface TierStatus {
  plan: string;
  lifetime_spend: number;
  plans: TierPlan[];
}

const TIER_DOT: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-400',
  platinum: 'bg-slate-800',
  diamond: 'bg-violet-500',
};

export default function TierTable() {
  const [sub, setSub] = useState<TierStatus | null>(null);

  useEffect(() => {
    apiClient
      .get('/subscriptions/status')
      .then(({ data }) => setSub(data))
      .catch(() => {});
  }, []);

  if (!sub || !Array.isArray(sub.plans) || sub.plans.length === 0) return null;

  const spend = sub.lifetime_spend || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-1">All membership tiers</h2>
      <p className="text-sm text-gray-500 mb-4">
        VPath Rewards is free — your tier rises automatically with your lifetime confirmed
        spend, and a higher tier means you keep a bigger share of every commission.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pr-4 font-medium">Tier</th>
              <th className="py-2 pr-4 font-medium">Unlocks at</th>
              <th className="py-2 pr-4 font-medium text-right">You keep</th>
            </tr>
          </thead>
          <tbody>
            {sub.plans.map((p) => {
              const isCurrent = p.key === sub.plan;
              const achieved = spend >= p.spend_threshold;
              return (
                <tr
                  key={p.key}
                  className={`border-b border-gray-50 last:border-0 ${
                    isCurrent ? 'bg-emerald-50' : ''
                  }`}
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          TIER_DOT[p.key] || 'bg-gray-300'
                        }`}
                      />
                      <span className="font-medium text-gray-800">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 tabular-nums">
                    {p.spend_threshold === 0
                      ? 'Everyone'
                      : `$${p.spend_threshold.toLocaleString()}`}
                    {achieved && p.spend_threshold > 0 && (
                      <span className="ml-1.5 text-emerald-600" aria-label="reached">
                        ✓
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-800 tabular-nums">
                    {p.commission_share}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
