/**
 * Shared job types for the cashback worker layer.
 * Jobs are designed to be enqueued and processed by a queue (e.g. BullMQ, Redis).
 * For now they can be run in-process; later: queue.add(jobName, payload) and worker processes run().
 */

export interface JobContext {
  /** Job id from queue (when using BullMQ etc.) */
  jobId?: string;
  /** Attempt number for retries */
  attempt?: number;
}

export interface JobResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  /** For metrics: counts, processed ids, etc. */
  meta?: Record<string, number | string>;
}

/** Base: every job has a name and a run function. */
export interface JobDefinition<TPayload = unknown, TResult = unknown> {
  name: string;
  run(payload: TPayload, ctx?: JobContext): Promise<JobResult<TResult>>;
}
