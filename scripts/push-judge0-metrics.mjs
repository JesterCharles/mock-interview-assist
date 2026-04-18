// scripts/push-judge0-metrics.mjs
//
// Per D-11 / IAC-04: pushes Judge0 queue depth + submission latency p50/p95 to
// GCE Logs Explorer every 60 seconds. Invoked by cron/systemd on the Judge0 VM.
// Installation: see docs/runbooks/coding-stack.md Appendix B (Plan 43-04).
//
// Environment:
//   JUDGE0_URL          default "http://localhost:2358"
//   JUDGE0_AUTH_TOKEN   required — matches Judge0 server X-Auth-Token
//   GCP_LOG_NAME        default "judge0-metrics"
//
// Auth: the Judge0 VM's default service account (nlm-judge0-metrics) has
// roles/logging.logWriter per Plan 43-01. `gcloud logging write` picks up
// instance metadata credentials automatically — no key file required.
//
// Exit codes:
//   0 — success OR Judge0 unreachable (cron continues; ERROR severity log emitted)
//   1 — gcloud itself failed (surfaces to systemd)

import { execFileSync } from 'node:child_process';

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || '';
const GCP_LOG_NAME = process.env.GCP_LOG_NAME || 'judge0-metrics';
const SAMPLE_LIMIT = 100; // recent submissions sampled per cycle

// Nearest-rank percentile. Simpler than linear interpolation and matches what
// ops tooling (Grafana, Datadog) generally expect for sparse small samples.
export function computePercentiles(latenciesMs) {
  if (!Array.isArray(latenciesMs) || latenciesMs.length === 0) {
    return { p50: 0, p95: 0, sampleSize: 0 };
  }
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const pick = (p) => {
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, idx)];
  };
  return {
    p50: pick(50),
    p95: pick(95),
    sampleSize: sorted.length,
  };
}

// Build the structured JSON payload emitted to Logs Explorer.
// Shape must match `.planning/phases/43-msa-deployment/43-03-PLAN.md` interfaces.
export function buildLogPayload({ queueDepth, latenciesMs, judge0Version, error } = {}) {
  const timestamp = new Date().toISOString();
  if (error) {
    return {
      timestamp,
      status: 'unreachable',
      error: error.message || String(error),
    };
  }
  const { p50, p95, sampleSize } = computePercentiles(latenciesMs || []);
  return {
    timestamp,
    status: 'ok',
    queueDepth: queueDepth ?? 0,
    p50Ms: p50,
    p95Ms: p95,
    sampleSize,
    judge0Version: judge0Version || 'unknown',
  };
}

async function fetchJudge0Metrics() {
  const headers = JUDGE0_AUTH_TOKEN ? { 'X-Auth-Token': JUDGE0_AUTH_TOKEN } : {};

  // /system_info — Judge0 version. Shape varies by Judge0 version; parse defensively.
  const systemInfoResp = await fetch(`${JUDGE0_URL}/system_info`, { headers });
  if (!systemInfoResp.ok) {
    throw new Error(`system_info returned HTTP ${systemInfoResp.status}`);
  }
  const systemInfo = await systemInfoResp.json();

  const judge0Version =
    systemInfo?.version ||
    systemInfo?.system_info?.version ||
    (Array.isArray(systemInfo) ? systemInfo.find((r) => r?.Judge0)?.Judge0 : null) ||
    'unknown';

  // /submissions — sample recent submission latencies.
  // Judge0 returns `time` in seconds (stringified); convert to ms.
  const subsResp = await fetch(
    `${JUDGE0_URL}/submissions?base64_encoded=false&fields=status_id,time&per_page=${SAMPLE_LIMIT}`,
    { headers }
  );
  if (!subsResp.ok) {
    throw new Error(`submissions returned HTTP ${subsResp.status}`);
  }
  const subsJson = await subsResp.json();
  const submissions = Array.isArray(subsJson?.submissions) ? subsJson.submissions : [];

  const latenciesMs = submissions
    .map((s) => {
      const t = parseFloat(s?.time);
      return Number.isFinite(t) ? t * 1000 : null;
    })
    .filter((n) => n !== null);

  // Queue depth proxy: submissions with status_id ∈ {1 (In Queue), 2 (Processing)}.
  // Judge0 1.13.x doesn't expose a dedicated queue endpoint; this approximation
  // is sufficient for the D-12 alert thresholds (queueDepth > 50 sustained).
  const queueDepth = submissions.filter(
    (s) => s?.status_id === 1 || s?.status_id === 2
  ).length;

  return { queueDepth, latenciesMs, judge0Version };
}

function writeLogEntry(payload) {
  const severity = payload.status === 'ok' ? 'INFO' : 'ERROR';
  // execFileSync with args array — no shell, no injection. Payload is passed
  // as a discrete argv; `--payload-type=json` tells Cloud Logging to treat the
  // entry as structured (filterable by jsonPayload.queueDepth > 50 etc.)
  execFileSync(
    'gcloud',
    [
      'logging',
      'write',
      GCP_LOG_NAME,
      JSON.stringify(payload),
      '--payload-type=json',
      `--severity=${severity}`,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
}

async function main() {
  let payload;
  try {
    const metrics = await fetchJudge0Metrics();
    payload = buildLogPayload(metrics);
  } catch (err) {
    payload = buildLogPayload({ error: err });
  }
  try {
    writeLogEntry(payload);
  } catch (err) {
    // gcloud itself failed — surface to cron/systemd
    console.error('gcloud logging write failed:', err.message || err);
    process.exit(1);
  }
}

// Only run main() when invoked directly, not when imported by tests.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  main();
}
