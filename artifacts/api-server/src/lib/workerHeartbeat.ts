const heartbeats = new Map<string, Date>();

export function recordHeartbeat(worker: string): void {
  heartbeats.set(worker, new Date());
}

export function getWorkerStatus(): Record<string, { lastRun: string | null; staleSec: number | null; healthy: boolean }> {
  const now = Date.now();
  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  const workers = ["sla-tracker", "escalation-worker", "stats-refresher"];
  const result: Record<string, { lastRun: string | null; staleSec: number | null; healthy: boolean }> = {};

  for (const name of workers) {
    const last = heartbeats.get(name);
    if (!last) {
      result[name] = { lastRun: null, staleSec: null, healthy: false };
    } else {
      const staleSec = Math.round((now - last.getTime()) / 1000);
      result[name] = {
        lastRun: last.toISOString(),
        staleSec,
        healthy: staleSec < STALE_THRESHOLD_MS / 1000,
      };
    }
  }
  return result;
}

export function allWorkersHealthy(): boolean {
  const status = getWorkerStatus();
  return Object.values(status).every((s) => s.healthy);
}
