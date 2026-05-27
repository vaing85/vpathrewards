import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import apiClient from '../../api/client';

// ---------------------------------------------------------------------------
// Job catalog (kept in sync with backend/src/jobs/index.ts startJobs())
// Status endpoints exist only for cj-sync and cj-advertisers; other jobs
// expose just "Run now". Schedules are UTC, since node-cron uses the
// container TZ and Railway containers run UTC.
// ---------------------------------------------------------------------------
type JobMeta = {
  key: string;            // matches JOB_NAMES values in jobs/index.ts
  label: string;
  schedule: string;       // cron expression
  scheduleHuman: string;  // for the UI
  description: string;
};

const JOBS: JobMeta[] = [
  {
    key: 'affiliate-sync',
    label: 'Affiliate sync',
    schedule: '0 * * * *',
    scheduleHuman: 'Hourly at :00',
    description: 'Pulls offers from configured affiliate networks.',
  },
  {
    key: 'payout-processor',
    label: 'Payout processor',
    schedule: '15 * * * *',
    scheduleHuman: 'Hourly at :15',
    description: 'Processes pending withdrawal payouts via Stripe Connect.',
  },
  {
    key: 'tracking-processor',
    label: 'Tracking processor',
    schedule: '30 * * * *',
    scheduleHuman: 'Hourly at :30',
    description: 'Processes affiliate click and conversion tracking.',
  },
  {
    key: 'link-checker',
    label: 'Link checker',
    schedule: '0 3 * * *',
    scheduleHuman: 'Daily 03:00 UTC',
    description: 'Validates that affiliate links still resolve.',
  },
  {
    key: 'cj-sync',
    label: 'CJ commissions sync',
    schedule: '30 3 * * *',
    scheduleHuman: 'Daily 03:30 UTC',
    description: 'Imports the last 7 days of CJ Affiliate commission events.',
  },
  {
    key: 'cj-advertiser-sync',
    label: 'CJ advertiser sync',
    schedule: '45 3 * * *',
    scheduleHuman: 'Daily 03:45 UTC',
    description: 'Enriches linked merchants with current CJ commission terms.',
  },
];

// Poll quickly while a job is actively running so the progress bar feels
// live, but back off when idle to stay well under the admin rate limit.
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 20000;

interface LastRun {
  ok: boolean;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

interface ProgressResponse {
  jobName?: string;
  total: number;
  processed: number;
  running: boolean;
  activeJob?: string | null;
  lastRuns?: Record<string, LastRun>;
}

interface CjSyncStatus {
  total: number;
  latest_posting_date: string | null;
  last_synced_at: string | null;
  by_status: Array<{ action_status: string | null; count: number; total_usd: number | null }>;
}

interface CjAdvertiserStatus {
  total_linked: number;
  unenriched: number;
  last_synced_at: string | null;
}

interface CjConfig {
  configured: boolean;
  hasToken: boolean;
  hasPublisherId: boolean;
}

const fmtRel = (iso: string | null): string => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const fmtUsd = (n: number | null): string =>
  n == null ? '—' : `$${n.toFixed(2)}`;

const AdminJobs = () => {
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [cjSync, setCjSync] = useState<CjSyncStatus | null>(null);
  const [cjAdvertisers, setCjAdvertisers] = useState<CjAdvertiserStatus | null>(null);
  const [cjConfig, setCjConfig] = useState<CjConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<Record<string, string>>({});

  const loadStatuses = useCallback(async () => {
    try {
      const [progressRes, cjSyncRes, cjAdvRes, cjConfigRes] = await Promise.all([
        apiClient.get<ProgressResponse>('/admin/jobs/progress'),
        apiClient.get<CjSyncStatus>('/admin/jobs/cj-sync/status'),
        apiClient.get<CjAdvertiserStatus>('/admin/jobs/cj-advertisers/status'),
        apiClient.get<CjConfig>('/admin/jobs/cj-config'),
      ]);
      setProgress(progressRes.data);
      setCjSync(cjSyncRes.data);
      setCjAdvertisers(cjAdvRes.data);
      setCjConfig(cjConfigRes.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load job statuses:', err);
      setError(err?.response?.data?.error || 'Failed to load job statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  const activeRef = useRef(false);
  activeRef.current =
    (progress?.running ?? false) || progress?.activeJob != null || runningJob != null;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = async () => {
      await loadStatuses();
      if (cancelled) return;
      timer = setTimeout(tick, activeRef.current ? FAST_POLL_MS : SLOW_POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isAuthenticated, navigate, loadStatuses]);

  const handleRunNow = async (jobKey: string, label: string) => {
    if (runningJob || progress?.activeJob || progress?.running) return;
    setRunningJob(jobKey);
    setLastRunResult((prev) => ({ ...prev, [jobKey]: `▶ ${label} started…` }));
    try {
      // Fire-and-forget: the server starts the job and responds immediately.
      // Outcome and progress are picked up by the /progress poll below.
      await apiClient.post('/admin/jobs/run', { jobName: jobKey });
      await loadStatuses();
    } catch (err: any) {
      setLastRunResult((prev) => ({
        ...prev,
        [jobKey]: `✗ ${err?.response?.data?.error ?? err.message ?? 'failed'}`,
      }));
    } finally {
      setRunningJob(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Loading job statuses…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Background jobs</h1>
        <p className="text-gray-600 mt-1">
          Schedules, manual triggers, and sync status for the in-process cron jobs.
          Updates every {FAST_POLL_MS / 1000}s while a job runs, {SLOW_POLL_MS / 1000}s otherwise.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* CJ credential status — the two CJ jobs skip silently when these env
          vars are missing, so make the configured/not-configured state obvious. */}
      {cjConfig && (
        cjConfig.configured ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-start gap-2">
            <span aria-hidden>✓</span>
            <div>
              <div className="font-semibold">CJ Affiliate connected</div>
              <div className="text-sm text-green-700">
                Credentials are configured. The CJ commissions and advertiser sync jobs will run against your CJ account.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex items-start gap-2">
            <span aria-hidden>⚠</span>
            <div>
              <div className="font-semibold">CJ Affiliate not configured — sync jobs will skip</div>
              <div className="text-sm text-amber-800 mt-1">
                Set the following in your backend environment (Railway → Variables), then redeploy:
              </div>
              <ul className="text-sm font-mono mt-2 space-y-1">
                <li>{cjConfig.hasToken ? '✓' : '✗'} CJ_PERSONAL_ACCESS_TOKEN</li>
                <li>{cjConfig.hasPublisherId ? '✓' : '✗'} CJ_PUBLISHER_ID</li>
              </ul>
            </div>
          </div>
        )
      )}

      {/* In-flight progress */}
      {progress?.running && (
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Job in progress: {progress.jobName ?? 'unknown'}
          </h2>
          <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 transition-all"
              style={{
                width: progress.total > 0
                  ? `${Math.min(100, (progress.processed / progress.total) * 100)}%`
                  : '0%',
              }}
            />
          </div>
          <p className="text-sm text-blue-700 mt-2">
            {progress.processed} / {progress.total}
            {progress.total > 0
              ? ` (${Math.round((progress.processed / progress.total) * 100)}%)`
              : ''}
          </p>
        </section>
      )}

      {/* Job catalog */}
      <section className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Scheduled jobs</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {JOBS.map((job) => {
              const busy = !!runningJob || !!progress?.activeJob || !!progress?.running;
              const isThisRunning =
                progress?.activeJob === job.key ||
                (progress?.running && progress?.jobName === job.key) ||
                runningJob === job.key;
              const lastRun = progress?.lastRuns?.[job.key];
              let result: string | null = null;
              if (isThisRunning) {
                result = '⏳ running…';
              } else if (lastRun) {
                result = lastRun.ok
                  ? `✓ completed ${fmtRel(lastRun.finishedAt)}`
                  : `✗ ${lastRun.error ?? 'failed'}`;
              } else if (lastRunResult[job.key]) {
                result = lastRunResult[job.key];
              }
              const resultIsError = !!result && result.startsWith('✗');
              return (
                <tr key={job.key}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.label}</div>
                    <div className="text-xs text-gray-400 font-mono">{job.key}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{job.scheduleHuman}</div>
                    <div className="text-xs text-gray-400 font-mono">{job.schedule}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{job.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => void handleRunNow(job.key, job.label)}
                      disabled={busy}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isThisRunning ? 'Running…' : 'Run now'}
                    </button>
                    {result && (
                      <div className={`text-xs mt-1 ${resultIsError ? 'text-red-600' : 'text-green-600'}`}>
                        {result}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* CJ sync detail */}
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">CJ commissions sync</h2>
        {cjSync ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Total imported</div>
              <div className="text-2xl font-bold text-gray-900">{cjSync.total.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Latest posting date</div>
              <div className="text-2xl font-bold text-gray-900">
                {cjSync.latest_posting_date
                  ? new Date(cjSync.latest_posting_date).toLocaleDateString()
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Last synced</div>
              <div className="text-2xl font-bold text-gray-900">{fmtRel(cjSync.last_synced_at)}</div>
              <div className="text-xs text-gray-500">
                {cjSync.last_synced_at
                  ? new Date(cjSync.last_synced_at).toLocaleString()
                  : ''}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No data.</p>
        )}
        {cjSync && cjSync.by_status.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Breakdown by status</h3>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cjSync.by_status.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{row.action_status ?? '(none)'}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{row.count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{fmtUsd(row.total_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CJ advertiser sync detail */}
      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">CJ advertiser sync</h2>
        {cjAdvertisers ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Linked merchants</div>
              <div className="text-2xl font-bold text-gray-900">
                {cjAdvertisers.total_linked.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Awaiting enrichment</div>
              <div className="text-2xl font-bold text-gray-900">
                {cjAdvertisers.unenriched.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                Merchants linked but missing CJ commission rate data.
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 font-medium">Last synced</div>
              <div className="text-2xl font-bold text-gray-900">
                {fmtRel(cjAdvertisers.last_synced_at)}
              </div>
              <div className="text-xs text-gray-500">
                {cjAdvertisers.last_synced_at
                  ? new Date(cjAdvertisers.last_synced_at).toLocaleString()
                  : ''}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No data.</p>
        )}
      </section>
    </div>
  );
};

export default AdminJobs;
