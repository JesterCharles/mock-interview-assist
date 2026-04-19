/**
 * Phase 46 Plan 03 Task 2 — tests for scripts/verify-migrations.sh.
 *
 * Uses a fake `npx` stub on PATH (scripts/__tests__/__fixtures__/fake-bin/npx)
 * toggled via FIXTURE_MODE env var. spawnSync under `bash` invokes the script
 * directly; exit codes assert the branch logic.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'verify-migrations.sh');
const FAKE_BIN = path.join(REPO_ROOT, 'scripts', '__tests__', '__fixtures__', 'fake-bin');

beforeAll(() => {
  // Guard against git stripping the executable bit on checkout.
  fs.chmodSync(SCRIPT, 0o755);
  fs.chmodSync(path.join(FAKE_BIN, 'npx'), 0o755);
});

function run(envOverrides: Record<string, string | undefined>) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${FAKE_BIN}:${process.env.PATH ?? ''}`,
  };
  for (const [k, v] of Object.entries(envOverrides)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return spawnSync('bash', [SCRIPT], {
    env,
    encoding: 'utf8',
  });
}

describe('verify-migrations.sh', () => {
  it('exits 2 when DIRECT_URL is unset', () => {
    const r = run({ DIRECT_URL: undefined, FIXTURE_MODE: 'up-to-date' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/DIRECT_URL env var not set/);
  });

  it('exits 3 when DIRECT_URL is the pooler (port 6543)', () => {
    const r = run({
      DIRECT_URL: 'postgresql://u:p@host:6543/postgres',
      FIXTURE_MODE: 'up-to-date',
    });
    expect(r.status).toBe(3);
    expect(r.stderr).toMatch(/pooler/i);
  });

  it('exits 0 when migrate status reports up-to-date', () => {
    const r = run({
      DIRECT_URL: 'postgresql://u:p@host:5432/postgres',
      FIXTURE_MODE: 'up-to-date',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Database schema is up to date/);
    expect(r.stdout).toMatch(/\[verify-migrations\] OK/);
  });

  it('exits 1 when migrate status reports pending migrations', () => {
    const r = run({
      DIRECT_URL: 'postgresql://u:p@host:5432/postgres',
      FIXTURE_MODE: 'pending',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/FAIL/);
  });
});
