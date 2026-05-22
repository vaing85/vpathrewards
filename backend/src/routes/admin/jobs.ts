/**
 * Admin endpoint to run jobs (affiliate sync, payout processor, tracking processor).
 * Use for manual/cron triggers until a queue (e.g. BullMQ) is connected.
 * Same runJob() is used here and will be used by the queue worker later.
 */
import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { dbGet, dbAll } from '../../database';
import { runJob, JOB_NAMES } from '../../jobs';
import { getProgress } from '../../jobs/progress';

const router = express.Router();

router.post('/run', authenticateAdmin, async (req: AdminRequest, res: express.Response) => {
  try {
    const { jobName, payload } = req.body as { jobName?: string; payload?: unknown };

    if (!jobName || typeof jobName !== 'string') {
      return res.status(400).json({ error: 'jobName (string) is required' });
    }

    const result = await runJob(jobName, payload ?? {}, { jobId: undefined, attempt: 0 });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: result.error,
        data: result.data,
        meta: result.meta
      });
    }

    res.json({
      ok: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    console.error('Admin job run error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/progress', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  const progress = getProgress();
  res.json(progress ?? { running: false, total: 0, processed: 0 });
});

router.get('/names', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  res.json({ jobs: JOB_NAMES });
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

// Convenience shortcut for the CJ advertiser sync job.
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

// Status of CJ-linked merchants — total linked, auto-imported pending review,
// latest sync timestamp.
router.get('/cj-advertisers/status', authenticateAdmin, async (_req: AdminRequest, res: express.Response) => {
  try {
    const [totalRow, autoImportedRow, latestRow] = await Promise.all([
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM merchants WHERE cj_advertiser_id IS NOT NULL'),
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM merchants WHERE cj_auto_imported = 1'),
      dbGet<{ synced_at: string | null }>('SELECT MAX(cj_synced_at) as synced_at FROM merchants'),
    ]);

    res.json({
      total_linked: totalRow?.count ?? 0,
      auto_imported_pending_review: autoImportedRow?.count ?? 0,
      last_synced_at: latestRow?.synced_at ?? null,
    });
  } catch (error) {
    console.error('CJ advertiser status error:', error);
    res.status(500).json({ error: 'Failed to load CJ advertiser status' });
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

export default router;
