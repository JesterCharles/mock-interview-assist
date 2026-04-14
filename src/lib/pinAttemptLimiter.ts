/**
 * PIN verification failure rate limiter.
 *
 * 5 failed attempts per fingerprint in a 15-minute rolling window → 429.
 * Successful verification resets the counter.
 *
 * In-memory store — acceptable for single-node deployment (GCE Docker).
 * If horizontally scaled, migrate to Redis/DB.
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptEntry {
  failures: number[]; // epoch ms timestamps of failures within window
}

const store = new Map<string, AttemptEntry>();

function prune(entry: AttemptEntry, now: number): void {
  const cutoff = now - WINDOW_MS;
  entry.failures = entry.failures.filter((t) => t >= cutoff);
}

export function isRateLimited(fingerprint: string): boolean {
  if (!fingerprint) return false;
  const entry = store.get(fingerprint);
  if (!entry) return false;
  prune(entry, Date.now());
  return entry.failures.length >= MAX_FAILURES;
}

export function recordFailure(fingerprint: string): void {
  if (!fingerprint) return;
  const now = Date.now();
  const entry = store.get(fingerprint) ?? { failures: [] };
  prune(entry, now);
  entry.failures.push(now);
  store.set(fingerprint, entry);
}

export function resetAttempts(fingerprint: string): void {
  if (!fingerprint) return;
  store.delete(fingerprint);
}

// Test-only helper.
export function __resetAll(): void {
  store.clear();
}
