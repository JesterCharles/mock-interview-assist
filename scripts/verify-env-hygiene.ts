/**
 * Phase 46 Plan 04 Task 1 — DATA-05 / T-46-03 / T-46-08.
 *
 * Scans tracked .env* files in the working directory for the PROD Supabase
 * project ref. If any file contains the ref, exits 1 with a VIOLATION line
 * naming the file. Clean checkout exits 0. Unset PROD_SUPABASE_REF exits 2.
 *
 * Usage:
 *   PROD_SUPABASE_REF=<prod-ref> npx tsx scripts/verify-env-hygiene.ts
 *   npm run verify-env-hygiene  (with env already exported)
 *
 * Why TS not bash: fixture-based vitest gets temp-dir + process.cwd +
 * cross-platform path handling for free.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const PROD_REF = process.env.PROD_SUPABASE_REF;
if (!PROD_REF) {
  console.error('[env-hygiene] FAIL: Set PROD_SUPABASE_REF env var');
  console.error(
    '[env-hygiene]   Usage: PROD_SUPABASE_REF=<prod-supabase-ref> npx tsx scripts/verify-env-hygiene.ts',
  );
  process.exit(2);
}

/**
 * All tracked .env variants. Non-existent files are silently skipped; the
 * set is intentionally broad to catch accidental Docker env leaks
 * (.env.docker) and documentation drift (.env.example).
 */
const ENV_FILES: readonly string[] = [
  '.env',
  '.env.local',
  '.env.docker',
  '.env.docker.example',
  '.env.example',
  '.env.judge0',
  '.env.judge0.example',
];

let violations = 0;
for (const fname of ENV_FILES) {
  const fp = path.resolve(process.cwd(), fname);
  if (!fs.existsSync(fp)) continue;
  const body = fs.readFileSync(fp, 'utf8');
  if (body.includes(PROD_REF)) {
    console.error(`[env-hygiene] VIOLATION: ${fname} contains prod ref "${PROD_REF}"`);
    violations += 1;
  }
}

if (violations > 0) {
  console.error(`[env-hygiene] FAIL — ${violations} file(s) reference prod.`);
  process.exit(1);
}
console.log('[env-hygiene] OK — no prod refs in .env files.');
