interface JobProgress {
  jobName: string;
  total: number;
  processed: number;
  running: boolean;
}

let current: JobProgress | null = null;

export function startProgress(jobName: string, total: number) {
  current = { jobName, total, processed: 0, running: true };
}

export function incrementProgress() {
  if (current) current.processed++;
}

export function clearProgress() {
  current = null;
}

export function getProgress(): JobProgress | null {
  return current;
}
