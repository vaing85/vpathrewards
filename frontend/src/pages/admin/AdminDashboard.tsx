import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionQueue {
  pending_withdrawals: { count: number; total_amount: number };
  pending_transactions: { count: number };
}

interface PeriodMetrics {
  commission_earned: number;
  fee_revenue: number;
  coffer: number;
  cashback_owed: number;
  paid_out: number;
}

interface PlatformMetrics {
  this_month: PeriodMetrics;
  last_month: PeriodMetrics;
  deltas: {
    commission_pct: number | null;
    fee_pct: number | null;
    coffer_pct: number | null;
    cashback_pct: number | null;
    paid_out_pct: number | null;
  };
}

interface Growth {
  new_users_this_week: number;
  new_users_last_week: number;
  new_users_pct: number | null;
  active_merchants: number;
  active_offers: number;
}

interface CjIntegration {
  commissions_imported: number;
  merchants_linked: number;
  merchants_unenriched: number;
  last_synced: {
    commissions: string | null;
    advertisers: string | null;
  };
}

interface ActivityRow {
  id: number;
  amount: number;
  status: string;
  transaction_date: string;
  user_id: number;
  user_name: string;
  user_email: string;
  merchant_name: string;
  offer_title: string;
}

interface Overview {
  action_queue: ActionQueue;
  platform_metrics: PlatformMetrics;
  growth: Growth;
  cj?: CjIntegration;
  recent_activity: ActivityRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtPct = (pct: number | null) => {
  if (pct === null) return null;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
};

const pctColor = (pct: number | null) => {
  if (pct === null || pct === 0) return 'text-gray-500';
  return pct > 0 ? 'text-emerald-600' : 'text-red-500';
};

const fmtRelativeTime = (iso: string | null): string => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    apiClient
      .get<Overview>('/admin/dashboard/overview')
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('Error fetching admin dashboard:', err);
        setError(err.response?.data?.error || 'Failed to load dashboard.');
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading admin overview…</div>
      </div>
    );
  }

  const aq = data?.action_queue;
  const pm = data?.platform_metrics;
  const gr = data?.growth;
  const cj = data?.cj;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Admin Overview</h1>
          <div className="text-xs text-gray-500">
            As of {new Date().toLocaleString()}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* ─── Zone 1: Needs your attention ─────────────────────────────── */}
        {aq && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Needs your attention
            </h2>
            {aq.pending_withdrawals.count === 0 && aq.pending_transactions.count === 0 ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Nothing in the approval queue. Good work.
              </div>
            ) : (
              <div className="space-y-3">
                {aq.pending_withdrawals.count > 0 && (
                  <Link
                    to="/admin/withdrawals"
                    className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl">💸</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800">
                          {aq.pending_withdrawals.count} withdrawal
                          {aq.pending_withdrawals.count === 1 ? '' : 's'} awaiting approval
                        </div>
                        <div className="text-sm text-gray-600">
                          Total: {fmtMoney(aq.pending_withdrawals.total_amount)}
                        </div>
                      </div>
                    </div>
                    <span className="text-amber-700 font-semibold group-hover:translate-x-1 transition flex-shrink-0">
                      Review →
                    </span>
                  </Link>
                )}
                {aq.pending_transactions.count > 0 && (
                  <Link
                    to="/admin/users"
                    className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl">📋</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800">
                          {aq.pending_transactions.count} cashback transaction
                          {aq.pending_transactions.count === 1 ? '' : 's'} pending confirmation
                        </div>
                        <div className="text-sm text-gray-600">
                          Awaiting affiliate network confirmation
                        </div>
                      </div>
                    </div>
                    <span className="text-blue-700 font-semibold group-hover:translate-x-1 transition flex-shrink-0">
                      View →
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Zone 2: Platform metrics (this month) ────────────────────── */}
        {pm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Platform metrics
              </h2>
              <span className="text-xs text-gray-500">This month vs last month</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Fee revenue"
                value={fmtMoney(pm.this_month.fee_revenue)}
                deltaPct={pm.deltas.fee_pct}
                color="emerald"
                primary
                subtitle="$5 service fee × conversions"
              />
              <MetricCard
                label="Coffer"
                value={fmtMoney(pm.this_month.coffer)}
                deltaPct={pm.deltas.coffer_pct}
                color="amber"
                primary
                subtitle="Variable margin after tier split"
              />
              <MetricCard
                label="Cashback owed to users"
                value={fmtMoney(pm.this_month.cashback_owed)}
                deltaPct={pm.deltas.cashback_pct}
                color="blue"
                subtitle="Liability — paid on withdrawal"
              />
              <MetricCard
                label="Paid out via withdrawals"
                value={fmtMoney(pm.this_month.paid_out)}
                deltaPct={pm.deltas.paid_out_pct}
                color="violet"
                subtitle="Confirmed cashouts to users"
              />
            </div>
          </div>
        )}

        {/* ─── Zone 3: Growth ───────────────────────────────────────────── */}
        {gr && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Growth
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">New users this week</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-800">
                    {gr.new_users_this_week}
                  </span>
                  {fmtPct(gr.new_users_pct) && (
                    <span className={`text-sm font-medium ${pctColor(gr.new_users_pct)}`}>
                      {fmtPct(gr.new_users_pct)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  vs {gr.new_users_last_week} last week
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Active merchants</div>
                <div className="text-2xl font-bold text-gray-800">{gr.active_merchants}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Active offers</div>
                <div className="text-2xl font-bold text-gray-800">{gr.active_offers}</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Zone 3b: CJ integration ──────────────────────────────────── */}
        {cj && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                CJ integration
              </h2>
              <Link to="/admin/cj" className="text-xs text-blue-600 hover:underline font-medium">
                Manage →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CjStat
                label="Commissions imported"
                value={cj.commissions_imported.toLocaleString()}
                relTime={cj.last_synced.commissions}
              />
              <CjStat
                label="Merchants linked to CJ"
                value={cj.merchants_linked.toLocaleString()}
                relTime={cj.last_synced.advertisers}
              />
              <CjStat
                label="Linked but not enriched"
                value={cj.merchants_unenriched.toLocaleString()}
                relTime={cj.last_synced.advertisers}
                highlighted={cj.merchants_unenriched > 0}
              />
            </div>

            {cj.merchants_linked === 0 && (
              <div className="mt-4 text-xs text-gray-500">
                Set <code className="px-1 py-0.5 bg-gray-100 rounded">merchants.cj_advertiser_id</code> on a merchant to enable CJ enrichment.
                Find the ID in the CJ Member portal.
              </div>
            )}
          </div>
        )}

        {/* ─── Zone 4: Quick actions ────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction to="/admin/withdrawals" label="Withdrawals" emoji="💸" />
            <QuickAction to="/admin/merchants" label="Merchants" emoji="🏬" />
            <QuickAction to="/admin/offers" label="Offers" emoji="🏷️" />
            <QuickAction to="/admin/users" label="Users" emoji="👥" />
          </div>
        </div>

        {/* ─── Zone 5: Recent activity ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Recent activity
          </h2>
          {!data?.recent_activity || data.recent_activity.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-6">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recent_activity.map((row) => (
                <li key={row.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {row.merchant_name} · {row.user_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {row.offer_title} · {row.user_email} ·{' '}
                      {new Date(row.transaction_date).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-800 tabular-nums">
                      {fmtMoney(row.amount)}
                    </div>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        row.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  deltaPct: number | null;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
  primary?: boolean;
  subtitle?: string;
}

const COLOR_CLASSES: Record<MetricCardProps['color'], { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
  blue: { bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
  violet: { bg: 'bg-violet-50 border-violet-100', text: 'text-violet-700' },
  amber: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
};

const MetricCard = ({ label, value, deltaPct, color, primary, subtitle }: MetricCardProps) => {
  const c = COLOR_CLASSES[color];
  return (
    <div className={`rounded-lg p-4 border ${c.bg}`}>
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div className={`font-bold tabular-nums ${primary ? 'text-3xl' : 'text-2xl'} ${c.text}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>
      )}
      {fmtPct(deltaPct) && (
        <div className={`text-xs mt-1 font-medium ${pctColor(deltaPct)}`}>
          {fmtPct(deltaPct)} vs last month
        </div>
      )}
    </div>
  );
};

interface CjStatProps {
  label: string;
  value: string;
  relTime: string | null;
  highlighted?: boolean;
}

const CjStat = ({ label, value, relTime, highlighted }: CjStatProps) => (
  <div>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={`text-2xl font-bold ${highlighted ? 'text-amber-700' : 'text-gray-800'}`}>
      {value}
    </div>
    <div className="text-xs text-gray-400 mt-1">synced {fmtRelativeTime(relTime)}</div>
  </div>
);

interface QuickActionProps {
  to: string;
  label: string;
  emoji: string;
}

const QuickAction = ({ to, label, emoji }: QuickActionProps) => (
  <Link
    to={to}
    className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition text-center"
  >
    <span className="text-2xl" aria-hidden>{emoji}</span>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </Link>
);

export default AdminDashboard;
