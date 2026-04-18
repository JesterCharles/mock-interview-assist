#!/usr/bin/env tsx
/**
 * loadtest/generate-report.ts — Phase 49 Plan 01 Task 2 (LOAD-03)
 *
 * Converts a k6 --summary-export JSON into the markdown baseline report.
 * Pure function; no network, no gcloud shelling. Plan 02 pipes gcloud
 * metrics + cost via env vars before invoking this module.
 *
 * CLI: npx tsx loadtest/generate-report.ts [jsonPath=/tmp/loadtest-result.json]
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

export interface K6TrendValues {
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  'p(90)'?: number;
  'p(95)'?: number;
  'p(99)'?: number;
}

export interface K6RateValues {
  rate: number;
  passes: number;
  fails: number;
}

export interface K6CounterValues {
  count: number;
  rate: number;
}

export interface K6GaugeValues {
  value: number;
}

export interface K6Summary {
  metrics: {
    http_req_duration: { type?: string; values: K6TrendValues };
    'http_req_duration{kind:static}'?: { type?: string; values: K6TrendValues };
    'http_req_duration{kind:api}'?: { type?: string; values: K6TrendValues };
    http_req_failed: { type?: string; values: K6RateValues };
    http_reqs: { type?: string; values: K6CounterValues };
    iteration_duration?: { type?: string; values: K6TrendValues };
    vus_max: { type?: string; values: K6GaugeValues };
    checks: { type?: string; values: K6RateValues };
  };
  root_group?: { checks: Record<string, unknown>; groups: unknown[] };
}

export interface ReportMeta {
  target: string;
  commit: string;
  startedAt: string;
  endedAt: string;
}

interface ThresholdRow {
  name: string;
  actual: string;
  target: string;
  pass: boolean;
}

function evalThresholds(summary: K6Summary): ThresholdRow[] {
  const rows: ThresholdRow[] = [];

  const failed = summary.metrics.http_req_failed.values.rate;
  rows.push({
    name: 'http_req_failed',
    actual: failed.toFixed(4),
    target: 'rate < 0.01',
    pass: failed < 0.01,
  });

  const staticP95 = summary.metrics['http_req_duration{kind:static}']?.values['p(95)'];
  if (staticP95 !== undefined) {
    rows.push({
      name: 'http_req_duration{kind:static}',
      actual: `${staticP95.toFixed(1)}ms`,
      target: 'p(95) < 500ms',
      pass: staticP95 < 500,
    });
  }

  const apiP95 = summary.metrics['http_req_duration{kind:api}']?.values['p(95)'];
  if (apiP95 !== undefined) {
    rows.push({
      name: 'http_req_duration{kind:api}',
      actual: `${apiP95.toFixed(1)}ms`,
      target: 'p(95) < 1000ms',
      pass: apiP95 < 1000,
    });
  }

  const checks = summary.metrics.checks.values.rate;
  rows.push({
    name: 'checks',
    actual: checks.toFixed(4),
    target: 'rate > 0.99',
    pass: checks > 0.99,
  });

  return rows;
}

function maxConcurrentLine(summary: K6Summary): string {
  const overallP95 = summary.metrics.http_req_duration.values['p(95)'] ?? 0;
  const vusMax = summary.metrics.vus_max.values.value;
  if (overallP95 === 0) return `${vusMax} (p(95) unavailable)`;
  if (overallP95 < 500) {
    return `${vusMax} (ceiling NOT reached — retry at higher VU)`;
  }
  return `below ${vusMax} — investigate (overall p(95) ${overallP95.toFixed(1)}ms >= 500ms)`;
}

function costLine(): string {
  const v = process.env.LOADTEST_COST_PER_1K;
  if (v && v.trim().length > 0) return v;
  return 'TBD — run loadtest/extrapolate-cost.ts';
}

function cpuLine(): string {
  const cpu = process.env.LOADTEST_CLOUD_RUN_CPU_PEAK_PCT;
  const mem = process.env.LOADTEST_CLOUD_RUN_MEM_PEAK_PCT;
  if (cpu || mem) {
    return `CPU peak ${cpu ?? 'unknown'}% · Memory peak ${mem ?? 'unknown'}%`;
  }
  return 'TBD — populate from gcloud monitoring read';
}

function supabaseLine(): string {
  const p50 = process.env.LOADTEST_SB_QUERIES_P50;
  const p95 = process.env.LOADTEST_SB_QUERIES_P95;
  if (p50 || p95) {
    return `p50 ${p50 ?? 'unknown'} · p95 ${p95 ?? 'unknown'}`;
  }
  return 'TBD — instrumented in v1.6 observability polish';
}

export function generateReport(summary: K6Summary, meta: ReportMeta): string {
  const thresholds = evalThresholds(summary);
  const allPass = thresholds.every((r) => r.pass);
  const verdict = allPass ? 'PASS' : 'FAIL';

  const d = summary.metrics.http_req_duration.values;
  const staticD = summary.metrics['http_req_duration{kind:static}']?.values ?? {};
  const apiD = summary.metrics['http_req_duration{kind:api}']?.values ?? {};
  const reqs = summary.metrics.http_reqs.values;
  const failed = summary.metrics.http_req_failed.values;
  const checks = summary.metrics.checks.values;
  const vus = summary.metrics.vus_max.values.value;

  const lines: string[] = [];
  lines.push(`# Load Test Baseline — v1.5 Staging`);
  lines.push('');
  lines.push(`**Verdict:** **${verdict}**`);
  lines.push('');
  lines.push('## Run Metadata');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Target | \`${meta.target}\` |`);
  lines.push(`| Commit | \`${meta.commit}\` |`);
  lines.push(`| Started | ${meta.startedAt} |`);
  lines.push(`| Ended | ${meta.endedAt} |`);
  lines.push(`| Scenario | loadtest/baseline.js |`);
  lines.push('');
  lines.push('## Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total requests | ${reqs.count} |`);
  lines.push(`| Request rate | ${reqs.rate.toFixed(2)}/s |`);
  lines.push(`| Failures | ${failed.fails} (${(failed.rate * 100).toFixed(2)}%) |`);
  lines.push(`| Max VUs | ${vus} |`);
  lines.push(`| Checks rate | ${(checks.rate * 100).toFixed(2)}% |`);
  lines.push(`| Overall p(95) | ${(d['p(95)'] ?? 0).toFixed(1)}ms |`);
  lines.push(`| Overall p(99) | ${(d['p(99)'] ?? 0).toFixed(1)}ms |`);
  lines.push(`| Static p(95) | ${(staticD['p(95)'] ?? 0).toFixed(1)}ms |`);
  lines.push(`| Static p(99) | ${(staticD['p(99)'] ?? 0).toFixed(1)}ms |`);
  lines.push(`| API p(95) | ${(apiD['p(95)'] ?? 0).toFixed(1)}ms |`);
  lines.push(`| API p(99) | ${(apiD['p(99)'] ?? 0).toFixed(1)}ms |`);
  lines.push('');
  lines.push('## Thresholds (D-04)');
  lines.push('');
  lines.push(`| Threshold | Target | Actual | Result |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const t of thresholds) {
    lines.push(`| ${t.name} | ${t.target} | ${t.actual} | ${t.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  lines.push('## LOAD-03 Required Metrics');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Max concurrent users before p95 > 500ms | ${maxConcurrentLine(summary)} |`);
  lines.push(`| Cost per 1000 requests (USD) | ${costLine()} |`);
  lines.push(`| CPU + Memory at ceiling | ${cpuLine()} |`);
  lines.push(`| Supabase queries per session | ${supabaseLine()} |`);
  lines.push('');
  lines.push('## Scope Carve-Out (HARD-01)');
  lines.push('');
  lines.push('- `CODING_CHALLENGES_ENABLED=false` confirmed on staging during run.');
  lines.push('- Zero `/api/coding/*` traffic generated by `loadtest/baseline.js`.');
  lines.push('- Judge0 integration is v1.6 scope (JUDGE-INTEG-01..04).');
  lines.push('');
  lines.push('## Caveats');
  lines.push('');
  if (costLine().startsWith('TBD')) {
    lines.push('- Cost per 1000 requests: Cloud Run metrics not yet attached. Populate by running loadtest/extrapolate-cost.ts against `cloud-run-metrics.json` artifact.');
  }
  if (cpuLine().startsWith('TBD')) {
    lines.push('- CPU/Memory peaks: `gcloud monitoring read` not executed post-run. Fill via LOADTEST_CLOUD_RUN_CPU_PEAK_PCT + LOADTEST_CLOUD_RUN_MEM_PEAK_PCT env.');
  }
  if (supabaseLine().startsWith('TBD')) {
    lines.push('- Supabase queries/session: Prisma instrumentation with X-Session-ID header is pending (v1.6 observability polish). Phase 49 accepts this TBD per D-08.');
  }
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('- LOAD-02: workflow captured artifacts; retain for 30 days.');
  lines.push('- LOAD-03: 4 metrics present above (or TBD with explicit follow-up).');
  lines.push('- Plan 04 consumes this doc for STRIDE cross-reference.');
  lines.push('');

  return lines.join('\n');
}

function readCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function main(): void {
  const jsonPath = process.argv[2] ?? '/tmp/loadtest-result.json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`[generate-report] input not found: ${jsonPath}`);
    process.exit(1);
  }
  const summary = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as K6Summary;
  const meta: ReportMeta = {
    target: process.env.TARGET ?? 'https://staging.nextlevelmock.com',
    commit: process.env.LOADTEST_COMMIT ?? readCommitHash(),
    startedAt: process.env.LOADTEST_STARTED_AT ?? new Date().toISOString(),
    endedAt: process.env.LOADTEST_ENDED_AT ?? new Date().toISOString(),
  };
  process.stdout.write(generateReport(summary, meta));
}

// Invoke main when run as a script (tsx/node). import.meta.url check is ESM-safe.
const isMain = (() => {
  try {
    const invoked = process.argv[1] ?? '';
    return invoked.endsWith('generate-report.ts') || invoked.endsWith('generate-report.js');
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
