/**
 * loadtest/__tests__/generate-report.test.ts — Phase 49 Plan 01 Task 2
 *
 * Tests for generateReport(summary, meta) — pure function, no network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { generateReport, type K6Summary } from '../generate-report';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', 'k6-summary-sample.json');

function loadPassFixture(): K6Summary {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as K6Summary;
}

function loadFailFixture(): K6Summary {
  const base = loadPassFixture();
  // http_req_failed rate > 1% (threshold breach).
  base.metrics.http_req_failed.values.rate = 0.03;
  base.metrics.http_req_failed.values.fails = 374;
  return base;
}

const META = {
  target: 'https://staging.nextlevelmock.com',
  commit: 'abc1234',
  startedAt: '2026-04-18T10:00:00Z',
  endedAt: '2026-04-18T10:10:00Z',
};

describe('generateReport', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LOADTEST_COST_PER_1K;
    delete process.env.LOADTEST_CLOUD_RUN_CPU_PEAK_PCT;
    delete process.env.LOADTEST_CLOUD_RUN_MEM_PEAK_PCT;
    delete process.env.LOADTEST_SB_QUERIES_P50;
    delete process.env.LOADTEST_SB_QUERIES_P95;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('emits PASS verdict when all thresholds satisfied', () => {
    const md = generateReport(loadPassFixture(), META);
    expect(md).toMatch(/^# Load Test Baseline/m);
    expect(md).toContain('## Metrics');
    expect(md).toMatch(/Verdict:\*?\*?\s*\*\*PASS\*\*/);
    // p(95) number appears somewhere.
    expect(md).toMatch(/\bp\(95\)/);
  });

  it('emits FAIL verdict when http_req_failed > 1%', () => {
    const md = generateReport(loadFailFixture(), META);
    expect(md).toMatch(/Verdict:\*?\*?\s*\*\*FAIL\*\*/);
    // Threshold table flags http_req_failed row as FAIL.
    expect(md).toMatch(/http_req_failed[^\n]*FAIL/);
  });

  it('uses LOADTEST_COST_PER_1K env when set', () => {
    process.env.LOADTEST_COST_PER_1K = '$0.0042';
    const md = generateReport(loadPassFixture(), META);
    expect(md).toContain('$0.0042');
  });

  it('prints TBD cost placeholder when env unset', () => {
    const md = generateReport(loadPassFixture(), META);
    expect(md).toContain('TBD — run loadtest/extrapolate-cost.ts');
  });

  it('includes all 4 LOAD-03 required metrics (headings)', () => {
    const md = generateReport(loadPassFixture(), META);
    expect(md).toMatch(/max concurrent users/i);
    expect(md).toMatch(/cost per 1000/i);
    expect(md).toMatch(/CPU/);
    expect(md).toMatch(/queries per session/i);
  });

  it('records run metadata (target, commit, timestamps)', () => {
    const md = generateReport(loadPassFixture(), META);
    expect(md).toContain('https://staging.nextlevelmock.com');
    expect(md).toContain('abc1234');
    expect(md).toContain('2026-04-18T10:00:00Z');
  });
});
