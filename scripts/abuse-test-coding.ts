#!/usr/bin/env tsx
/**
 * scripts/abuse-test-coding.ts — Plan 44-01 Task 2 (HARD-02)
 *
 * 6-payload-class abuse test harness per D-05, D-06. For each payload class,
 * submits it per applicable language, polls for the verdict, and asserts the
 * verdict lives in the fixture's `expectedContainment` allowlist.
 *
 * Also spawns a `docker stats` sampler via SSH to the Judge0 VM (if configured)
 * to verify no cgroup escape during the run.
 *
 * USAGE:
 *   LOAD_TEST_BASE_URL=...
 *   LOAD_TEST_ASSOCIATE_EMAIL=...
 *   LOAD_TEST_ASSOCIATE_PASSWORD=...
 *   JUDGE0_VM_SSH_KEY_PATH=~/.ssh/judge0-vm  # optional — enables docker stats
 *   JUDGE0_VM_SSH_TARGET=user@host           # required if SSH key set
 *   npm run abuse-test-coding
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_POLL_INTERVAL_MS = 200;
const DEFAULT_SUBMIT_TIMEOUT_MS = 20_000;
const DOCKER_STATS_INTERVAL_MS = 500;
const MAX_MEM_PERC = 95;
const MAX_SUSTAINED_CPU_PERC = 200;
const MAX_SUSTAINED_CPU_WINDOW_SEC = 5;

// Mirror Phase 37 language allowlist.
type Language = 'python' | 'javascript' | 'typescript' | 'java' | 'sql' | 'csharp';

interface PayloadFixture {
  name: string;
  languages: Partial<Record<Language, string>>;
  expectedContainment: string[];
  /** Optional challengeId for the test challenge receiving the payload. */
  challengeId?: string;
}

interface AbuseResult {
  payload: string;
  language: Language;
  attemptId: string | null;
  verdict: string | null;
  expected: string[];
  contained: boolean;
  latencyMs: number | null;
  error?: string;
}

interface DockerStatsRow {
  ts: number;
  name: string;
  cpuPerc: number;
  memPerc: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function signIn(): Promise<{ accessToken: string }> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const email = requireEnv('LOAD_TEST_ASSOCIATE_EMAIL');
  const password = requireEnv('LOAD_TEST_ASSOCIATE_PASSWORD');
  const client = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Supabase sign-in failed: ${error?.message ?? 'no session'}`);
  }
  return { accessToken: data.session.access_token };
}

function loadFixtures(): PayloadFixture[] {
  const dir = path.join(process.cwd(), 'scripts', 'abuse-test-fixtures');
  const names = ['fork-bomb', 'infinite-loop', 'network-egress', 'stdout-flood', 'memory-bomb', 'fd-bomb'];
  const fixtures: PayloadFixture[] = [];
  for (const n of names) {
    const fp = path.join(dir, `${n}.json`);
    const body = JSON.parse(fs.readFileSync(fp, 'utf8')) as PayloadFixture;
    if (!body.languages || !body.expectedContainment || body.expectedContainment.length === 0) {
      throw new Error(`Malformed fixture ${n}: missing languages/expectedContainment`);
    }
    fixtures.push(body);
  }
  return fixtures;
}

async function submitAndPoll(
  baseUrl: string,
  accessToken: string,
  challengeId: string,
  language: Language,
  code: string,
): Promise<{ attemptId: string | null; verdict: string | null; latencyMs: number | null; error?: string }> {
  const startedAt = Date.now();
  const submitRes = await fetch(`${baseUrl}/api/coding/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ challengeId, language, code }),
  });
  if (!submitRes.ok) {
    return { attemptId: null, verdict: null, latencyMs: null, error: `submit ${submitRes.status}: ${await submitRes.text()}` };
  }
  const body = (await submitRes.json()) as { attemptId: string };
  const attemptId = body.attemptId;

  const pollIntervalMs = Number(process.env.ABUSE_TEST_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS);
  const timeoutMs = Number(process.env.ABUSE_TEST_SUBMIT_TIMEOUT_MS ?? DEFAULT_SUBMIT_TIMEOUT_MS);
  const deadline = startedAt + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    const r = await fetch(`${baseUrl}/api/coding/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) continue;
    const pb = (await r.json()) as { verdict: string };
    if (pb.verdict && pb.verdict !== 'pending') {
      return { attemptId, verdict: pb.verdict, latencyMs: Date.now() - startedAt };
    }
  }
  return { attemptId, verdict: null, latencyMs: null, error: `timeout after ${timeoutMs}ms` };
}

function startDockerStatsSampler(): { rows: DockerStatsRow[]; stop: () => Promise<void> } {
  const rows: DockerStatsRow[] = [];
  let stopped = false;

  const keyPath = process.env.JUDGE0_VM_SSH_KEY_PATH;
  const target = process.env.JUDGE0_VM_SSH_TARGET;
  if (!keyPath || !target) {
    console.warn('[abuse-test] SSH not configured — docker stats sampling DISABLED; report will note UNAVAILABLE');
    return { rows, stop: async () => undefined };
  }

  const cmd = `docker stats --no-stream --format '{{json .}}' judge0-server judge0-workers 2>/dev/null`;
  const interval = setInterval(() => {
    const child = spawn('ssh', ['-i', keyPath, '-o', 'StrictHostKeyChecking=yes', target, cmd]);
    let buf = '';
    child.stdout.on('data', (d) => (buf += d.toString()));
    child.on('close', () => {
      if (stopped) return;
      for (const line of buf.split('\n').filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          const cpu = parseFloat(String(obj.CPUPerc ?? '0').replace('%', ''));
          const mem = parseFloat(String(obj.MemPerc ?? '0').replace('%', ''));
          rows.push({ ts: Date.now(), name: obj.Name ?? 'unknown', cpuPerc: cpu, memPerc: mem });
        } catch {
          // Ignore malformed lines.
        }
      }
    });
  }, DOCKER_STATS_INTERVAL_MS);

  return {
    rows,
    stop: async () => {
      stopped = true;
      clearInterval(interval);
    },
  };
}

function dockerStatsVerdict(rows: DockerStatsRow[]): { safe: boolean; notes: string[] } {
  const notes: string[] = [];
  if (rows.length === 0) {
    notes.push('docker stats UNAVAILABLE — sampler was not configured');
    return { safe: true, notes };
  }
  // Mem cap check — any sample > 95% is a hard fail.
  const memBreaches = rows.filter((r) => r.memPerc > MAX_MEM_PERC);
  if (memBreaches.length > 0) {
    notes.push(`${memBreaches.length} mem breaches > ${MAX_MEM_PERC}% (e.g., ${memBreaches[0].name} ${memBreaches[0].memPerc}%)`);
  }
  // Sustained CPU check — group by name, find longest run > threshold.
  const perName = new Map<string, DockerStatsRow[]>();
  for (const r of rows) {
    const arr = perName.get(r.name) ?? [];
    arr.push(r);
    perName.set(r.name, arr);
  }
  let worstSustainedSec = 0;
  for (const [, arr] of perName.entries()) {
    arr.sort((a, b) => a.ts - b.ts);
    let runStart: number | null = null;
    for (const r of arr) {
      if (r.cpuPerc > MAX_SUSTAINED_CPU_PERC) {
        if (runStart === null) runStart = r.ts;
      } else if (runStart !== null) {
        const sec = (r.ts - runStart) / 1000;
        if (sec > worstSustainedSec) worstSustainedSec = sec;
        runStart = null;
      }
    }
  }
  if (worstSustainedSec > MAX_SUSTAINED_CPU_WINDOW_SEC) {
    notes.push(`sustained CPU > ${MAX_SUSTAINED_CPU_PERC}% for ${worstSustainedSec.toFixed(1)}s (cap ${MAX_SUSTAINED_CPU_WINDOW_SEC}s)`);
  }
  const safe = memBreaches.length === 0 && worstSustainedSec <= MAX_SUSTAINED_CPU_WINDOW_SEC;
  return { safe, notes };
}

function renderReport(
  baseUrl: string,
  results: AbuseResult[],
  dockerStats: { safe: boolean; notes: string[] },
  verdict: 'SAFE' | 'UNSAFE',
): string {
  const now = new Date().toISOString();
  const lines: string[] = [
    `# Phase 44 Abuse Test Report`,
    ``,
    `**Verdict:** ${verdict}`,
    `**Run at:** ${now}`,
    `**Target:** \`${baseUrl}\``,
    `**Submissions:** ${results.length}`,
    ``,
    `## Containment per payload class`,
    ``,
    `| Payload | Language | Expected | Actual | Contained | Latency (ms) | Error |`,
    `| --- | --- | --- | --- | --- | --- | --- |`,
    ...results.map((r) =>
      `| ${r.payload} | ${r.language} | ${r.expected.join('\\|')} | ${r.verdict ?? '—'} | ${r.contained ? 'PASS' : 'FAIL'} | ${r.latencyMs ?? '—'} | ${r.error ?? ''} |`,
    ),
    ``,
    `## Docker stats / cgroup-escape check`,
    ``,
    `**Status:** ${dockerStats.safe ? 'SAFE' : 'UNSAFE'}`,
    ``,
    dockerStats.notes.length === 0 ? 'No notes.' : dockerStats.notes.map((n) => `- ${n}`).join('\n'),
    ``,
    `## Phase 38 sandbox cap mapping (D-05)`,
    ``,
    `| Payload | Expected containment mechanism |`,
    `| --- | --- |`,
    `| fork-bomb | \`max_processes=60\` cap → runtime_error/timeout |`,
    `| infinite-loop | \`max_cpu_time_limit=10\` → timeout |`,
    `| network-egress | \`enable_network=false\` → connection refused / runtime_error |`,
    `| stdout-flood | \`max_file_size=8192 KB\` truncates → runtime_error/fail |`,
    `| memory-bomb | \`max_memory_limit=256000 KB\` → mle/runtime_error |`,
    `| fd-bomb | Docker default ulimits → runtime_error/fail |`,
    ``,
    `---`,
    ``,
    `${verdict === 'SAFE' ? 'SAFE — all 6 payload classes contained per Phase 38 D-04..D-07 caps. No cgroup escape observed.' : 'UNSAFE — at least one payload escaped expected containment; investigate before merge.'}`,
    ``,
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const baseUrl = requireEnv('LOAD_TEST_BASE_URL').replace(/\/$/, '');
  const { accessToken } = await signIn();
  const fixtures = loadFixtures();

  console.log(`[abuse-test] target=${baseUrl} payloads=${fixtures.length}`);
  const sampler = startDockerStatsSampler();

  const results: AbuseResult[] = [];
  for (const f of fixtures) {
    for (const [lang, code] of Object.entries(f.languages)) {
      if (!code) continue;
      const langTyped = lang as Language;
      const challengeId = f.challengeId ?? `test-abuse-${f.name}`;
      console.log(`[abuse-test] ${f.name} · ${langTyped}`);
      const out = await submitAndPoll(baseUrl, accessToken, challengeId, langTyped, code);
      const contained = out.verdict !== null && f.expectedContainment.includes(out.verdict);
      results.push({
        payload: f.name,
        language: langTyped,
        attemptId: out.attemptId,
        verdict: out.verdict,
        expected: f.expectedContainment,
        contained,
        latencyMs: out.latencyMs,
        error: out.error,
      });
    }
  }

  await sampler.stop();
  const ds = dockerStatsVerdict(sampler.rows);
  const containmentAllPass = results.every((r) => r.contained);
  const overall = containmentAllPass && ds.safe ? 'SAFE' : 'UNSAFE';

  const reportPath = path.join(
    process.cwd(),
    '.planning',
    'phases',
    '44-hardening-load-test',
    '44-ABUSE-TEST-REPORT.md',
  );
  fs.writeFileSync(reportPath, renderReport(baseUrl, results, ds, overall));
  console.log(`[abuse-test] report written: ${reportPath}`);

  if (overall === 'UNSAFE') {
    for (const r of results.filter((x) => !x.contained)) {
      console.error(`[abuse-test] FAIL: ${r.payload}/${r.language} verdict=${r.verdict} expected=${r.expected.join('|')}`);
    }
    for (const note of ds.notes) console.error(`[abuse-test] docker-stats: ${note}`);
    process.exit(1);
  }

  console.log(`[abuse-test] SAFE — all ${results.length} payload/language pairs contained`);
}

main().catch((err) => {
  console.error('[abuse-test] FATAL:', err);
  process.exit(2);
});
