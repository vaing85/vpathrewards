/**
 * Admin endpoint to run jobs (affiliate sync, payout processor, tracking processor).
 * Use for manual/cron triggers until a queue (e.g. BullMQ) is connected.
 * Same runJob() is used here and will be used by the queue worker later.
 */
import express from 'express';
import { authenticateAdmin, AdminRequest } from '../../middleware/adminAuth';
import { runJob, JOB_NAMES } from '../../jobs';

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

router.get('/names', authenticateAdmin, (_req: AdminRequest, res: express.Response) => {
  res.json({ jobs: JOB_NAMES });
});

export default router;
