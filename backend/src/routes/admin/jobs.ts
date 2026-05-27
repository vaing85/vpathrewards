/**
 * Admin endpoint to run jobs (affiliate sync, payout processor, tracking processor).
 * Use for manual/cron triggers until a queue (e.g. BullMQ) is connected.
 * Same runJob() is used here and will be used by the queue worker later.
 */
import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbGet, dbAll } from '../../database';
import { runJob, JOB_NAMES, isKnownJob } from '../../jobs';
import { getProgress } from '../../jobs/progress';
import { startJobAsync, getActiveJob, getLastRuns } from '../../jobs/jobRunner';
import { isCjConfigured } from '../../services/cjApi';

const router = express.Router();

// Kick a job off in the background and return immediately. Awaiting long jobs
// (link-checker runs ~1.8h) holds the HTTP connection open until the proxy
// resets it; the UI polls /progress for status and the recorded outcome.
router.post('/run', authenticateAdmin, (req: AdminRequest, res: express.Response) => {
  const { jobName, payload } = req.body as { jobName?: string; payload?: unknown };

  if (!jobName || typeof jobName !== 'string') {
    return res.status(400).json({ error: 'jobName (string) is required' });
  }
  if (!isKnownJob(jobName)) {
    return res.status(400).json({ error: `Unknown job: ${jobName}` });
  }
  if (!startJobAsync(jobName, payload ?? {})) {
    return res.status(409).json({ error: 'A job is already running' });
  }

  res.status(202).json({ ok: true, started: true, jobName });
});

router.get('/progress', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  const progress = getProgress();
  res.json({
    ...(progress ?? { running: false, total: 0, processed: 0 }),
    activeJob: getActiveJob(),
    lastRuns: getLastRuns(),
  });
});

router.get('/names', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  res.json({ jobs: JOB_NAMES });
});

// Whether the CJ credentials are present in the environment. The CJ sync jobs
// skip cleanly when these are missing, so the admin UI surfaces this to avoid
// silently-skipping syncs looking like a broken integration. Reports which of
// the two vars is missing (admin-only) to make a typo easy to spot — never the
// values themselves.
router.get('/cj-config', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  res.json({
    configured: isCjConfigured(),
    hasToken: Boolean(process.env.CJ_PERSONAL_ACCESS_TOKEN),
    hasPublisherId: Boolean(process.env.CJ_PUBLISHER_ID),
  });
});

// Convenience shortcut for the CJ sync job. Equivalent to POST /run with
// jobName: 'cj-sync' but cleaner to wire into an admin UI button.
router.post('/cj-sync/run', authenticateAdmin, async (req: AdminRequest, res: express.Response) => {
  try {
    const { lookbackDays } = (req.body ?? {}) as { lookbackDays?: number };
    const result = await runJob(JOB_NAMES.CJ_SYNC, { lookbackDays });
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error, data: result.data, meta: result.meta });
    }
    res.json({ ok: true, data: result.data, meta: result.meta });
  } catch (error) {
    console.error('CJ sync run error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Aggregate view of imported CJ commissions — counts and totals by action_status.
router.get('/cj-sync/status', authenticateAdmin, async (_req: AdminRequest, res: express.Response) => {
  try {
    const [totalRow, latestRow, statusRows] = await Promise.all([
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM cj_commissions'),
      dbGet<{ posting_date: string | null; created_at: string | null }>(
        'SELECT MAX(posting_date) as posting_date, MAX(created_at) as created_at FROM cj_commissions'
      ),
      dbAll<{ action_status: string | null; count: number; total_usd: number | null }>(
        `SELECT action_status, COUNT(*) as count, SUM(pub_commission_amount_usd) as total_usd
         FROM cj_commissions
         GROUP BY action_status`
      ),
    ]);

    res.json({
      total: totalRow?.count ?? 0,
      latest_posting_date: latestRow?.posting_date ?? null,
      last_synced_at: latestRow?.created_at ?? null,
      by_status: statusRows,
    });
  } catch (error) {
    console.error('CJ sync status error:', error);
    res.status(500).json({ error: 'Failed to load CJ sync status' });
  }
});

// Convenience shortcut for the CJ advertiser enrichment job.
router.post('/cj-advertisers/run', authenticateAdmin, async (req: AdminRequest, res: express.Response) => {
  try {
    const { dryRun } = (req.body ?? {}) as { dryRun?: boolean };
    const result = await runJob(JOB_NAMES.CJ_ADVERTISER_SYNC, { dryRun });
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.error, data: result.data, meta: result.meta });
    }
    res.json({ ok: true, data: result.data, meta: result.meta });
  } catch (error) {
    console.error('CJ advertiser sync run error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status of CJ advertiser enrichment — total linked merchants, how many are
// still missing the CJ commission rate data, and the latest sync time.
router.get('/cj-advertisers/status', authenticateAdmin, async (_req: AdminRequest, res: express.Response) => {
  try {
    const [totalRow, unenrichedRow, latestRow] = await Promise.all([
      dbGet<{ count: number }>(
        'SELECT COUNT(*) as count FROM merchants WHERE cj_advertiser_id IS NOT NULL'
      ),
      dbGet<{ count: number }>(
        `SELECT COUNT(*) as count FROM merchants
         WHERE cj_advertiser_id IS NOT NULL AND cj_max_commission_rate IS NULL`
      ),
      dbGet<{ synced_at: string | null }>(
        'SELECT MAX(cj_synced_at) as synced_at FROM merchants'
      ),
    ]);

    res.json({
      total_linked: totalRow?.count ?? 0,
      unenriched: unenrichedRow?.count ?? 0,
      last_synced_at: latestRow?.synced_at ?? null,
    });
  } catch (error) {
    console.error('CJ advertiser status error:', error);
    res.status(500).json({ error: 'Failed to load CJ advertiser status' });
  }
});

export default router;
