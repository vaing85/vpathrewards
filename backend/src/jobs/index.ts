/**
 * Job definitions for the cashback worker layer.
 * Use these with an in-process runner now; later connect to Redis/BullMQ.
 *
 * Example (future with BullMQ):
 *   import { Queue, Worker } from 'bullmq';
 *   const queue = new Queue('cashback-jobs', { connection: redis });
 *   await queue.add(affiliateSyncJob.name, { merchantId: 1 });
 *
 *   const worker = new Worker('cashback-jobs', async (job) => {
 *     const def = JOB_REGISTRY[job.name];
 *     if (def) return def.run(job.data, { jobId: job.id, attempt: job.attemptsMade });
 *   }, { connection: redis });
 */

import affiliateSyncJob from './affiliateSync.job';
import payoutProcessorJob from './payoutProcessor.job';
import trackingProcessorJob from './trackingProcessor.job';
import linkCheckerJob from './linkChecker.job';
import cjSyncJob from './cjSync.job';
import cjAdvertiserSyncJob from './cjAdvertiserSync.job';
import cjLinkRefreshJob from './cjLinkRefresh.job';
import cron from 'node-cron';
import type { JobDefinition, JobResult } from './types';

export type { JobContext, JobResult, JobDefinition } from './types';
export { default as affiliateSyncJob } from './affiliateSync.job';
export { default as payoutProcessorJob } from './payoutProcessor.job';
export { default as trackingProcessorJob } from './trackingProcessor.job';
export { default as linkCheckerJob } from './linkChecker.job';
export { default as cjSyncJob } from './cjSync.job';
export { default as cjAdvertiserSyncJob } from './cjAdvertiserSync.job';
export { default as cjLinkRefreshJob } from './cjLinkRefresh.job';

export const JOB_NAMES = {
  AFFILIATE_SYNC: affiliateSyncJob.name,
  PAYOUT_PROCESSOR: payoutProcessorJob.name,
  TRACKING_PROCESSOR: trackingProcessorJob.name,
  LINK_CHECKER: linkCheckerJob.name,
  CJ_SYNC: cjSyncJob.name,
  CJ_ADVERTISER_SYNC: cjAdvertiserSyncJob.name,
  CJ_LINK_REFRESH: cjLinkRefreshJob.name,
} as const;

const JOB_REGISTRY: Record<string, JobDefinition<unknown, unknown>> = {
  [affiliateSyncJob.name]: affiliateSyncJob as JobDefinition<unknown, unknown>,
  [payoutProcessorJob.name]: payoutProcessorJob as JobDefinition<unknown, unknown>,
  [trackingProcessorJob.name]: trackingProcessorJob as JobDefinition<unknown, unknown>,
  [linkCheckerJob.name]: linkCheckerJob as JobDefinition<unknown, unknown>,
  [cjSyncJob.name]: cjSyncJob as JobDefinition<unknown, unknown>,
  [cjAdvertiserSyncJob.name]: cjAdvertiserSyncJob as JobDefinition<unknown, unknown>,
  [cjLinkRefreshJob.name]: cjLinkRefreshJob as JobDefinition<unknown, unknown>,
};

/**
 * Start all in-process cron jobs.
 * Called once from server.ts after DB init.
 */
export function startJobs() {
  // Alert checker — every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const { checkCashbackAlerts } = await import('./alertChecker.job');
      await checkCashbackAlerts();
    } catch (err) {
      console.error('[alertChecker] error:', err);
    }
  });

  // Existing jobs — hourly
  cron.schedule('0 * * * *', () => runJob(affiliateSyncJob.name));
  cron.schedule('15 * * * *', () => runJob(payoutProcessorJob.name));
  cron.schedule('30 * * * *', () => runJob(trackingProcessorJob.name));

  // Link checker — daily at 3am
  cron.schedule('0 3 * * *', () => runJob(linkCheckerJob.name));

  // CJ sync — daily at 3:30am, after link checker. Pulls last 7 days so missing
  // a single run is harmless.
  cron.schedule('30 3 * * *', () => runJob(cjSyncJob.name));

  // CJ advertiser sync — daily at 3:45am, after commissions sync. Less
  // frequent change rate than commissions; daily is plenty.
  cron.schedule('45 3 * * *', () => runJob(cjAdvertiserSyncJob.name));

  // CJ link refresh — daily at 4:00am, after advertiser sync so newly
  // discovered merchants get their links populated on the same day.
  cron.schedule('0 4 * * *', () => runJob(cjLinkRefreshJob.name));

  console.log('[jobs] Cron jobs started');
}

/**
 * Run a job by name with optional payload. Use for in-process runs or from a queue worker.
 */
export async function runJob(
  jobName: string,
  payload?: unknown,
  ctx?: { jobId?: string; attempt?: number }
): Promise<JobResult> {
  const job = JOB_REGISTRY[jobName];
  if (!job) {
    return { ok: false, error: `Unknown job: ${jobName}` };
  }
  return job.run(payload ?? {}, ctx);
}
