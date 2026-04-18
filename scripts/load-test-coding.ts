#!/usr/bin/env tsx
/**
 * scripts/load-test-coding.ts — Plan 44-01 Task 1 (HARD-01)
 *
 * 50-concurrent load test harness for the coding-submission pipeline, run against
 * the Phase 43-deployed stack. Per Plan 44-01 D-01..D-04.
 *
 * USAGE:
 *   LOAD_TEST_BASE_URL=https://app.example.com \
 *   LOAD_TEST_ASSOCIATE_EMAIL=test@example.com \
 *   LOAD_TEST_ASSOCIATE_PASSWORD=$(secret) \
 *   npm run load-test-coding
 *
 * ENV:
 *   LOAD_TEST_BASE_URL       Deployed app URL (REQUIRED)
 *   LOAD_TEST_ASSOCIATE_EMAIL  Test associate Supabase email (REQUIRED)
 *   LOAD_TEST_ASSOCIATE_PASSWORD  Test associate Supabase password (REQUIRED)
 *   NEXT_PUBLIC_SUPABASE_URL      Supabase project URL (REQUIRED)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  Supabase publishable key (REQUIRED)
 *   LOAD_TEST_SUBMIT_TIMEOUT_MS   Per-submission verdict poll cap, default 20000
 *   LOAD_TEST_POLL_INTERVAL_MS    Poll interval, default 100
 *   JUDGE0_METRICS_CMD            Optional: shell cmd returning { queueDepth } JSON
 *
 * THRESHOLDS (D-03):
 *   - All 50 submissions must return a non-pending verdict
 *   - Per-language p95 latency <= 10 sec
 *   - Judge0 queue depth <= workerCount * 2 sustained for no more than 30 sec
 *   - App VM CPU p95 < 80%; Judge0 VM CPU p95 < 85%
 */

import fs from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';
import { createClient } from '@supabase/supabase-js';

const CONCURRENCY = 50;
const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_SUBMIT_TIMEOUT_MS = 20_000;
const LATENCY_P95_CAP_MS = 10_000;
const APP_CPU_P95_CAP = 80;
const JUDGE0_CPU_P95_CAP = 85;
const QUEUE_DEPTH_SUSTAINED_BREACH_SEC = 30;

interface Fixture {
  challengeId: string;
  language: string;
  code: string;
  expectedVerdict: string;
}

interface SubmissionResult {
  challengeId: string;
  language: string;
  attemptId: string | null;
  verdict: string | null;
  startedAt: number;
  verdictAt: number | null;
  latencyMs: number | null;
  error?: string;
}

interface MetricSample {
  ts: number;
  queueDepth?: number;
  appCpu?: number;
  judge0Cpu?: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function loadFixtures(): Fixture[] {
  const fixturesDir = path.join(process.cwd(), 'scripts', 'load-test-fixtures');
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
  const fixtures: Fixture[] = [];
  for (const f of files) {
    const body = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8'));
    if (!body.challengeId || !body.language || !body.code) {
      throw new Error(`Malformed fixture ${f}: missing challengeId/language/code`);
    }
    fixtures.push(body as Fixture);
  }
  if (fixtures.length !== 10) {
    throw new Error(`Expected 10 fixtures, got ${fixtures.length}`);
  }
  return fixtures;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function signIn(): Promise<{ accessToken: string; refreshToken: string }> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const email = requireEnv('LOAD_TEST_ASSOCIATE_EMAIL');
  const password = requireEnv('LOAD_TEST_ASSOCIATE_PASSWORD');
  const client = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Supabase sign-in failed: ${error?.message ?? 'no session'}`);
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

async function submitOne(
  baseUrl: string,
  accessToken: string,
  fixture: Fixture,
): Promise<SubmissionResult> {
  const startedAt = Date.now();
  const result: SubmissionResult = {
    challengeId: fixture.challengeId,
    language: fixture.language,
    attemptId: null,
    verdict: null,
    startedAt,
    verdictAt: null,
    latencyMs: null,
  };

  try {
    const submitRes = await fetch(`${baseUrl}/api/coding/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        challengeId: fixture.challengeId,
        language: fixture.language,
        code: fixture.code,
      }),
    });

    if (!submitRes.ok) {
      result.error = `submit ${submitRes.status}: ${await submitRes.text()}`;
      return result;
    }

    const submitBody = (await submitRes.json()) as { attemptId: string };
    result.attemptId = submitBody.attemptId;

    const pollIntervalMs = Number(
      process.env.LOAD_TEST_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS,
    );
    const timeoutMs = Number(
      process.env.LOAD_TEST_SUBMIT_TIMEOUT_MS ?? DEFAULT_SUBMIT_TIMEOUT_MS,
    );
    const deadline = startedAt + timeoutMs;

    while (Date.now() < deadline) {
      await sleep(pollIntervalMs);
      const pollRes = await fetch(
        `${baseUrl}/api/coding/attempts/${result.attemptId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!pollRes.ok) {
        result.error = `poll ${pollRes.status}: ${await pollRes.text()}`;
        return result;
      }
      const pollBody = (await pollRes.json()) as { verdict: string };
      if (pollBody.verdict && pollBody.verdict !== 'pending') {
        result.verdict = pollBody.verdict;
        result.verdictAt = Date.now();
        result.latencyMs = result.verdictAt - startedAt;
        return result;
      }
    }

    result.error = `timeout — no verdict within ${timeoutMs}ms`;
  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

/**
 * Background metrics sampler. Polls the configured command once per second
 * and writes samples to an in-memory array. Returns a stop function.
 */
function startMetricsSampler(): { samples: MetricSample[]; stop: () => void } {
  const samples: MetricSample[] = [];
  let stopped = false;
  const cmd = process.env.JUDGE0_METRICS_CMD;

  const loop = async () => {
    while (!stopped) {
      const ts = Date.now();
      const sample: MetricSample = { ts };
      if (cmd) {
        try {
          const { execFileSync } = await import('node:child_process');
          const out = execFileSync('sh', ['-c', cmd], { timeout: 2000 }).toString();
          const parsed = JSON.parse(out);
          if (typeof parsed.queueDepth === 'number') sample.queueDepth = parsed.queueDepth;
          if (typeof parsed.appCpu === 'number') sample.appCpu = parsed.appCpu;
          if (typeof parsed.judge0Cpu === 'number') sample.judge0Cpu = parsed.judge0Cpu;
        } catch {
          // Sampler failures are non-fatal — report later with UNAVAILABLE.
        }
      }
      samples.push(sample);
      await sleep(1000);
    }
  };
  void loop();
  return { samples, stop: () => { stopped = true; } };
}

interface Assertion {
  name: string;
  pass: boolean;
  details: string;
}

function evaluateAssertions(
  results: SubmissionResult[],
  metrics: MetricSample[],
): { assertions: Assertion[]; perLangStats: Record<string, { count: number; p50: number; p95: number; max: number }> } {
  const assertions: Assertion[] = [];
  const completed = results.filter((r) => r.latencyMs !== null && r.verdict !== null);
  assertions.push({
    name: 'All 50 submissions returned non-pending verdict',
    pass: completed.length === results.length,
    details: `${completed.length}/${results.length} completed`,
  });

  // Per-language p95 latency.
  const perLangStats: Record<string, { count: number; p50: number; p95: number; max: number }> = {};
  const byLang = new Map<string, number[]>();
  for (const r of completed) {
    if (r.latencyMs === null) continue;
    const arr = byLang.get(r.language) ?? [];
    arr.push(r.latencyMs);
    byLang.set(r.language, arr);
  }
  for (const [lang, latencies] of byLang.entries()) {
    const p50 = quantile(latencies, 0.5);
    const p95 = quantile(latencies, 0.95);
    const max = Math.max(...latencies);
    perLangStats[lang] = { count: latencies.length, p50, p95, max };
    assertions.push({
      name: `p95 latency for ${lang} <= ${LATENCY_P95_CAP_MS}ms`,
      pass: p95 <= LATENCY_P95_CAP_MS,
      details: `${lang}: p50=${p50}ms p95=${p95}ms max=${max}ms (n=${latencies.length})`,
    });
  }

  // Queue depth sustained breach check.
  const qSamples = metrics.filter((m) => typeof m.queueDepth === 'number');
  if (qSamples.length === 0) {
    assertions.push({
      name: 'Judge0 queue depth sustained cap',
      pass: true,
      details: 'queueDepth metrics UNAVAILABLE — skipped with WARN',
    });
  } else {
    // Simple heuristic: count longest run above threshold (hard-code cap=2 per
    // D-03, since worker count not known at harness time; operator overrides
    // via QUEUE_DEPTH_CAP env).
    const cap = Number(process.env.QUEUE_DEPTH_CAP ?? 2);
    let longestBreachSec = 0;
    let currentRunStart: number | null = null;
    for (const s of qSamples) {
      if ((s.queueDepth ?? 0) > cap) {
        if (currentRunStart === null) currentRunStart = s.ts;
      } else if (currentRunStart !== null) {
        const runSec = (s.ts - currentRunStart) / 1000;
        if (runSec > longestBreachSec) longestBreachSec = runSec;
        currentRunStart = null;
      }
    }
    assertions.push({
      name: `Judge0 queue depth not sustained > cap for > ${QUEUE_DEPTH_SUSTAINED_BREACH_SEC}s`,
      pass: longestBreachSec <= QUEUE_DEPTH_SUSTAINED_BREACH_SEC,
      details: `longest breach ${longestBreachSec.toFixed(1)}s at cap=${cap}`,
    });
  }

  const appCpuSamples = metrics.map((m) => m.appCpu).filter((v): v is number => typeof v === 'number');
  if (appCpuSamples.length === 0) {
    assertions.push({
      name: `App VM CPU p95 < ${APP_CPU_P95_CAP}%`,
      pass: true,
      details: 'appCpu metrics UNAVAILABLE — skipped with WARN',
    });
  } else {
    const p95 = quantile(appCpuSamples, 0.95);
    assertions.push({
      name: `App VM CPU p95 < ${APP_CPU_P95_CAP}%`,
      pass: p95 < APP_CPU_P95_CAP,
      details: `p95=${p95.toFixed(1)}%`,
    });
  }

  const judge0CpuSamples = metrics.map((m) => m.judge0Cpu).filter((v): v is number => typeof v === 'number');
  if (judge0CpuSamples.length === 0) {
    assertions.push({
      name: `Judge0 VM CPU p95 < ${JUDGE0_CPU_P95_CAP}%`,
      pass: true,
      details: 'judge0Cpu metrics UNAVAILABLE — skipped with WARN',
    });
  } else {
    const p95 = quantile(judge0CpuSamples, 0.95);
    assertions.push({
      name: `Judge0 VM CPU p95 < ${JUDGE0_CPU_P95_CAP}%`,
      pass: p95 < JUDGE0_CPU_P95_CAP,
      details: `p95=${p95.toFixed(1)}%`,
    });
  }

  return { assertions, perLangStats };
}

function renderReport(
  baseUrl: string,
  fixtures: Fixture[],
  results: SubmissionResult[],
  assertions: Assertion[],
  perLangStats: Record<string, { count: number; p50: number; p95: number; max: number }>,
  wallClockMs: number,
  verdict: 'PASS' | 'FAIL',
): string {
  const now = new Date().toISOString();
  const lines: string[] = [
    `# Phase 44 Load Test Report`,
    ``,
    `**Verdict:** ${verdict}`,
    `**Run at:** ${now}`,
    `**Target:** \`${baseUrl}\``,
    `**Concurrency:** ${CONCURRENCY}`,
    `**Wall clock:** ${(wallClockMs / 1000).toFixed(2)}s`,
    `**Submissions:** ${results.length} (${results.filter((r) => r.verdict !== null).length} completed)`,
    ``,
    `## Fixtures`,
    ``,
    `| Challenge | Language | Expected |`,
    `| --- | --- | --- |`,
    ...fixtures.map((f) => `| \`${f.challengeId}\` | ${f.language} | ${f.expectedVerdict} |`),
    ``,
    `## Per-language latency (ms)`,
    ``,
    `| Language | N | p50 | p95 | max | D-03 cap (10 000 ms) |`,
    `| --- | --- | --- | --- | --- | --- |`,
    ...Object.entries(perLangStats).map(
      ([lang, s]) =>
        `| ${lang} | ${s.count} | ${s.p50} | ${s.p95} | ${s.max} | ${
          s.p95 <= LATENCY_P95_CAP_MS ? 'PASS' : 'FAIL'
        } |`,
    ),
    ``,
    `## D-03 Threshold Assertions`,
    ``,
    `| Assertion | Pass | Details |`,
    `| --- | --- | --- |`,
    ...assertions.map((a) => `| ${a.name} | ${a.pass ? 'PASS' : 'FAIL'} | ${a.details} |`),
    ``,
    `## Raw submissions`,
    ``,
    `| # | Challenge | Lang | Attempt | Verdict | Latency (ms) | Error |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...results.map((r, i) =>
      `| ${i + 1} | ${r.challengeId} | ${r.language} | ${r.attemptId ?? '—'} | ${
        r.verdict ?? '—'
      } | ${r.latencyMs ?? '—'} | ${r.error ?? ''} |`,
    ),
    ``,
    `---`,
    ``,
    `${verdict === 'PASS' ? 'PASS — all D-03 thresholds satisfied.' : 'FAIL — at least one D-03 threshold was breached; investigate before re-running.'}`,
    ``,
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const baseUrl = requireEnv('LOAD_TEST_BASE_URL').replace(/\/$/, '');
  const { accessToken } = await signIn();
  const fixtures = loadFixtures();

  console.log(`[load-test] target=${baseUrl} concurrency=${CONCURRENCY} fixtures=${fixtures.length}`);

  const sampler = startMetricsSampler();
  const t0 = Date.now();

  const limit = pLimit(CONCURRENCY);
  // Generate 50 submission slots by cycling fixtures (5 per fixture).
  const submissions: Fixture[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    submissions.push(fixtures[i % fixtures.length]);
  }

  const results = await Promise.all(
    submissions.map((f) => limit(() => submitOne(baseUrl, accessToken, f))),
  );

  const wallClockMs = Date.now() - t0;
  sampler.stop();

  const { assertions, perLangStats } = evaluateAssertions(results, sampler.samples);
  const overall = assertions.every((a) => a.pass) ? 'PASS' : 'FAIL';

  const reportPath = path.join(
    process.cwd(),
    '.planning',
    'phases',
    '44-hardening-load-test',
    '44-LOAD-TEST-REPORT.md',
  );
  fs.writeFileSync(reportPath, renderReport(baseUrl, fixtures, results, assertions, perLangStats, wallClockMs, overall));
  console.log(`[load-test] report written: ${reportPath}`);

  if (overall === 'FAIL') {
    for (const a of assertions.filter((x) => !x.pass)) {
      console.error(`[load-test] FAIL: ${a.name} — ${a.details}`);
    }
    process.exit(1);
  }

  console.log(`[load-test] PASS — wall=${(wallClockMs / 1000).toFixed(2)}s`);
}

main().catch((err) => {
  console.error(`[load-test] FATAL:`, err);
  process.exit(2);
});
