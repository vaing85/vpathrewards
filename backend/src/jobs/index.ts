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
import type { JobDefinition, JobResult } from './types';

export type { JobContext, JobResult, JobDefinition } from './types';
export { default as affiliateSyncJob } from './affiliateSync.job';
export { default as payoutProcessorJob } from './payoutProcessor.job';
export { default as trackingProcessorJob } from './trackingProcessor.job';

export const JOB_NAMES = {
  AFFILIATE_SYNC: affiliateSyncJob.name,
  PAYOUT_PROCESSOR: payoutProcessorJob.name,
  TRACKING_PROCESSOR: trackingProcessorJob.name
} as const;

const JOB_REGISTRY: Record<string, JobDefinition<unknown, unknown>> = {
  [affiliateSyncJob.name]: affiliateSyncJob as JobDefinition<unknown, unknown>,
  [payoutProcessorJob.name]: payoutProcessorJob as JobDefinition<unknown, unknown>,
  [trackingProcessorJob.name]: trackingProcessorJob as JobDefinition<unknown, unknown>
};

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
