/**
 * Fire-and-forget runner for admin-triggered jobs.
 *
 * Long jobs (e.g. link-checker, ~1.8h) must not be awaited inside an HTTP
 * handler — the request would hang until the edge proxy reset the connection
 * (net::ERR_HTTP2_PROTOCOL_ERROR). Instead the route kicks the job off here,
 * returns immediately, and the UI polls /progress for live status and the
 * recorded outcome.
 *
 * In-process only: the progress tracker is a singleton, so at most one job
 * runs at a time.
 */
import { runJob } from './index';
import { getProgress } from './progress';

export interface LastRun {
  ok: boolean;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

let activeJob: string | null = null;
const lastRuns: Record<string, LastRun> = {};

export function getActiveJob(): string | null {
  return activeJob;
}

export function getLastRuns(): Record<string, LastRun> {
  return lastRuns;
}

/** A job is in flight if we started one, or a cron run is reporting progress. */
export function isBusy(): boolean {
  return activeJob !== null || getProgress()?.running === true;
}

/**
 * Start a job in the background. Returns false if a job is already running.
 */
export function startJobAsync(jobName: string, payload?: unknown): boolean {
  if (isBusy()) return false;
  activeJob = jobName;
  const startedAt = new Date().toISOString();
  void runJob(jobName, payload ?? {}, { jobId: undefined, attempt: 0 })
    .then((result) => {
      lastRuns[jobName] = {
        ok: result.ok,
        error: result.ok ? undefined : result.error,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    })
    .catch((err: unknown) => {
      lastRuns[jobName] = {
        ok: false,
        error: err instanceof Error ? err.message : 'Internal error',
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    })
    .finally(() => {
      activeJob = null;
    });
  return true;
}
