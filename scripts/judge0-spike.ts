#!/usr/bin/env tsx
/**
 * Judge0 spike harness — JUDGE-06 gate (Plan 38-03).
 *
 * Submits 10 fixtures in parallel, polls each to completion, samples
 * `docker stats` every ~1 sec, emits a JSON report with peaks + p50/p95.
 *
 * Usage:
 *   JUDGE0_URL=http://localhost:2358 JUDGE0_AUTH_TOKEN=xxx tsx scripts/judge0-spike.ts
 *
 * Env overrides:
 *   RUNS     = number of runs (default 3)
 *   OUTPUT   = path to write JSON report (default scripts/judge0-spike-output.json)
 *   NO_STATS = '1' to skip docker stats sampling (useful for smoke tests)
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  submit,
  getSubmission,
  type Judge0Language,
} from '../src/lib/judge0Client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Fixture {
  name: string;
  language: Judge0Language;
  sourceCode: string;
  stdin: string;
  expectedStdout: string;
  maxWallTimeSec: number;
  notes?: string;
}

interface SampleRow {
  timestampSec: number;
  container: string;
  cpuPct: number;
  memMiB: number;
  memPct: number;
}

interface SubmissionResult {
  fixture: string;
  language: string;
  token: string;
  submittedAt: string;
  completedAt: string;
  latencySec: number;
  verdict: string;
  expectedVerdict: 'pass';
  correct: boolean;
}

interface SpikeRunResult {
  runId: number;
  startedAt: string;
  wallClockSec: number;
  submissions: SubmissionResult[];
  dockerStats: SampleRow[];
  peaks: Record<string, { cpuPct: number; memMiB: number }>;
  p50Latency: Record<string, number>;
  p95Latency: Record<string, number>;
}

const FIXTURE_DIR = path.join(__dirname, 'judge0-spike-fixtures');
const RUNS = Number(process.env.RUNS ?? '3');
const NO_STATS = process.env.NO_STATS === '1';

async function loadFixtures(): Promise<Fixture[]> {
  const files = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(FIXTURE_DIR, f), 'utf-8'))),
  );
}

async function pollUntilDone(token: string, maxSec = 60) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < maxSec) {
    const res = await getSubmission(token);
    if (res.status.id >= 3) return res;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Poll timeout for ${token}`);
}

function normalizeOutput(s: string | null): string {
  return (s ?? '').replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function parseMemUsage(s: string): number {
  const used = s.trim().split('/')[0].trim();
  const n = parseFloat(used) || 0;
  if (used.includes('GiB') || used.includes('GB')) return n * 1024;
  return n;
}

function startDockerStatsSampler(): {
  stop: () => Promise<SampleRow[]>;
  child: ChildProcess | null;
} {
  if (NO_STATS) return { stop: async () => [], child: null };
  const samples: SampleRow[] = [];
  const child = spawn(
    'docker',
    [
      'stats',
      '--no-trunc',
      '--format',
      '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}',
    ],
    { stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const start = Date.now();
  child.stdout?.on('data', (buf: Buffer) => {
    for (const line of buf.toString().split('\n').filter(Boolean)) {
      const [name, cpuPerc, memUsage, memPerc] = line.split('|');
      if (!name?.startsWith('judge0')) continue;
      samples.push({
        timestampSec: (Date.now() - start) / 1000,
        container: name.trim(),
        cpuPct: parseFloat(cpuPerc) || 0,
        memMiB: parseMemUsage(memUsage ?? ''),
        memPct: parseFloat(memPerc ?? '0') || 0,
      });
    }
  });
  return {
    child,
    stop: async () => {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
      return samples;
    },
  };
}

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function runOnce(runId: number, fixtures: Fixture[]): Promise<SpikeRunResult> {
  const sampler = startDockerStatsSampler();
  const wallStart = Date.now();
  const startedAt = new Date().toISOString();
  const submitStarts: Record<string, number> = {};

  const submits = await Promise.all(
    fixtures.map(async (fx) => {
      submitStarts[fx.name] = Date.now();
      const { token } = await submit({
        sourceCode: fx.sourceCode,
        language: fx.language,
        stdin: fx.stdin,
        expectedStdout: fx.expectedStdout,
      });
      return { fx, token };
    }),
  );

  const results: SubmissionResult[] = await Promise.all(
    submits.map(async ({ fx, token }) => {
      const res = await pollUntilDone(token, fx.maxWallTimeSec * 3);
      const completedAt = Date.now();
      const correct =
        normalizeOutput(res.stdout) === normalizeOutput(fx.expectedStdout) &&
        res.status.id === 3;
      return {
        fixture: fx.name,
        language: fx.language,
        token,
        submittedAt: new Date(submitStarts[fx.name]).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        latencySec: (completedAt - submitStarts[fx.name]) / 1000,
        verdict: res.status.description,
        expectedVerdict: 'pass' as const,
        correct,
      };
    }),
  );

  const wallClockSec = (Date.now() - wallStart) / 1000;
  const samples = await sampler.stop();

  const peaks: Record<string, { cpuPct: number; memMiB: number }> = {};
  for (const s of samples) {
    const p = peaks[s.container] ?? { cpuPct: 0, memMiB: 0 };
    peaks[s.container] = {
      cpuPct: Math.max(p.cpuPct, s.cpuPct),
      memMiB: Math.max(p.memMiB, s.memMiB),
    };
  }
  const byLang: Record<string, number[]> = {};
  for (const r of results) (byLang[r.language] ??= []).push(r.latencySec);
  const p50Latency: Record<string, number> = {};
  const p95Latency: Record<string, number> = {};
  for (const [lang, xs] of Object.entries(byLang)) {
    p50Latency[lang] = percentile(xs, 0.5);
    p95Latency[lang] = percentile(xs, 0.95);
  }

  return {
    runId,
    startedAt,
    wallClockSec,
    submissions: results,
    dockerStats: samples,
    peaks,
    p50Latency,
    p95Latency,
  };
}

async function main() {
  const fixtures = await loadFixtures();
  if (fixtures.length !== 10) {
    throw new Error(`Expected 10 fixtures, got ${fixtures.length}`);
  }
  console.log(`[spike] Loaded ${fixtures.length} fixtures. Runs=${RUNS}.`);

  const runs: SpikeRunResult[] = [];
  for (let i = 1; i <= RUNS; i++) {
    console.log(`[spike] Run ${i}/${RUNS} starting...`);
    const result = await runOnce(i, fixtures);
    runs.push(result);
    const allCorrect = result.submissions.every((s) => s.correct);
    console.log(
      `[spike]   Run ${i}: wall=${result.wallClockSec.toFixed(2)}s, allCorrect=${allCorrect}`,
    );
    console.log(`[spike]   Peaks: ${JSON.stringify(result.peaks)}`);
    if (i < RUNS) await new Promise((r) => setTimeout(r, 10_000));
  }

  const output = process.env.OUTPUT ?? path.join(__dirname, 'judge0-spike-output.json');
  await writeFile(
    output,
    JSON.stringify({ runs, producedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`[spike] Report written to ${output}`);
}

main().catch((err) => {
  console.error('[spike] FAILED:', err);
  process.exit(1);
});
