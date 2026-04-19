/**
 * Phase 46 Plan 04 Task 1 — tests for scripts/verify-env-hygiene.ts.
 *
 * Uses fs.mkdtempSync + spawnSync('npx tsx ...') with a prod-ref injected
 * via env. Fixture .env files are written into the temp dir as needed.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'verify-env-hygiene.ts');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const PROD_REF_FIXTURE = 'prodref123abc';

function runInTempDir(
  tempDir: string,
  env: Record<string, string | undefined>,
) {
  const merged: NodeJS.ProcessEnv = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete merged[k];
    else merged[k] = v;
  }
  return spawnSync(TSX_BIN, [SCRIPT], {
    cwd: tempDir,
    env: merged,
    encoding: 'utf8',
  });
}

describe('verify-env-hygiene.ts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-hygiene-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('exits 2 when PROD_SUPABASE_REF is unset', () => {
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: undefined });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/Set PROD_SUPABASE_REF/);
  });

  it('exits 0 on a clean tempdir (no .env files)', () => {
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: PROD_REF_FIXTURE });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[env-hygiene\] OK/);
  });

  it('exits 1 when .env.local contains the prod ref', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env.local'),
      `SUPABASE_PROJECT=${PROD_REF_FIXTURE}\n`,
    );
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: PROD_REF_FIXTURE });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/VIOLATION.*\.env\.local/);
  });

  it('exits 1 when .env.docker contains the prod ref', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env.docker'),
      `DATABASE_URL=postgres://user:pw@${PROD_REF_FIXTURE}.supabase.co\n`,
    );
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: PROD_REF_FIXTURE });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/VIOLATION.*\.env\.docker/);
  });

  it('exits 0 when .env.example contains only a placeholder (no prod ref)', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env.example'),
      'SUPABASE_PROJECT=staging-ref-only\n',
    );
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: PROD_REF_FIXTURE });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[env-hygiene\] OK/);
  });

  it('reports multiple violations when more than one .env* file references prod', () => {
    fs.writeFileSync(path.join(tempDir, '.env.local'), `R=${PROD_REF_FIXTURE}\n`);
    fs.writeFileSync(path.join(tempDir, '.env.docker'), `R=${PROD_REF_FIXTURE}\n`);
    const r = runInTempDir(tempDir, { PROD_SUPABASE_REF: PROD_REF_FIXTURE });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/\.env\.local/);
    expect(r.stderr).toMatch(/\.env\.docker/);
    expect(r.stderr).toMatch(/2 file\(s\) reference prod/);
  });
});
