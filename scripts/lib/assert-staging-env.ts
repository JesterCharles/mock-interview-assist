/**
 * Phase 46 Plan 01 — Shared env-guard helper (D-11, D-20, T-46-01, T-46-02).
 *
 * Used by:
 *  - scripts/seed-staging.ts (assertStagingDatabase at top of main)
 *  - scripts/wipe-prod.ts    (assertProdDatabase at top of main)
 *  - scripts/verify-env-hygiene.ts reuses STAGING_REF
 *
 * Rationale: centralize the "is this URL pointed at the right env?" check in
 * one file so both seed-staging and wipe-prod have identical refusal semantics.
 *
 * F-01 (v1.5 code-review fix): both guards now validate BOTH `DATABASE_URL`
 * and `DIRECT_URL`. Previously, only `DATABASE_URL` was checked — but
 * `scripts/wipe-prod.ts` connects via `DIRECT_URL`, so an operator with
 * `DATABASE_URL=prod` + `DIRECT_URL=staging` passed the old guard then
 * wiped the wrong DB. Guards now refuse unless (a) both URLs are set,
 * (b) both point at the same Supabase project ref, and (c) both match the
 * expected env (prod-for-prod-wipe, staging-for-staging-seed).
 */

/** Staging Supabase project ref — constant per STATE.md v1.5 direction. */
export const STAGING_REF = 'lzuqbpqmqlvzwebliptj';

/**
 * Refuses to proceed unless BOTH `DATABASE_URL` and `DIRECT_URL` are set
 * AND both contain the staging project ref. Throws a loud error — exits
 * non-zero when called from a top-level script.
 *
 * Error messages embed maskUrl() output (never the raw URL, to avoid
 * leaking credentials into log streams).
 */
export function assertStagingDatabase(): void {
  assertEnvDatabaseUrls({
    label: 'assert-staging',
    expectedRef: STAGING_REF,
    requireNotRef: null,
    hint: 'Fix: export DATABASE_URL + DIRECT_URL from the staging Secret Manager project.\n  See docs/ENV-HYGIENE.md.',
  });
}

/**
 * Inverse of assertStagingDatabase — refuses to run unless BOTH
 * `DATABASE_URL` and `DIRECT_URL` point at the expected production project
 * ref AND neither contains the staging ref.
 *
 * Used by scripts/wipe-prod.ts. The inverted semantics prevent a classic
 * operator mistake: running the prod-wipe script against staging.
 */
export function assertProdDatabase(expectedProdRef: string): void {
  assertEnvDatabaseUrls({
    label: 'assert-prod',
    expectedRef: expectedProdRef,
    requireNotRef: STAGING_REF,
    hint: 'Fix: export DATABASE_URL + DIRECT_URL from the prod Secret Manager project.',
  });
}

interface AssertOptions {
  label: 'assert-staging' | 'assert-prod';
  /** Ref that both URLs MUST contain. */
  expectedRef: string;
  /** Ref that neither URL may contain (null disables the check). */
  requireNotRef: string | null;
  hint: string;
}

function assertEnvDatabaseUrls(opts: AssertOptions): void {
  const database = process.env.DATABASE_URL ?? '';
  const direct = process.env.DIRECT_URL ?? '';

  if (!database) {
    throw new Error(
      `[${opts.label}] REFUSING to run: DATABASE_URL env var is unset.\n` +
        `  ${opts.hint}`,
    );
  }
  if (!direct) {
    throw new Error(
      `[${opts.label}] REFUSING to run: DIRECT_URL env var is unset.\n` +
        `  ${opts.hint}`,
    );
  }

  // Wrong-env check: refuse if either URL contains a forbidden ref
  // (e.g. staging ref present while asserting prod).
  if (opts.requireNotRef) {
    if (database.includes(opts.requireNotRef)) {
      throw new Error(
        `[${opts.label}] REFUSING to run against STAGING. DATABASE_URL references forbidden ref "${opts.requireNotRef}".\n` +
          `  Got: ${maskUrl(database)}`,
      );
    }
    if (direct.includes(opts.requireNotRef)) {
      throw new Error(
        `[${opts.label}] REFUSING to run against STAGING. DIRECT_URL references forbidden ref "${opts.requireNotRef}".\n` +
          `  Got: ${maskUrl(direct)}`,
      );
    }
  }

  // Expected-env check: refuse unless BOTH URLs reference the expected project.
  if (!database.includes(opts.expectedRef)) {
    throw new Error(
      `[${opts.label}] DATABASE_URL does not reference the expected project ref "${opts.expectedRef}".\n` +
        `  Got: ${maskUrl(database)}\n` +
        `  ${opts.hint}`,
    );
  }
  if (!direct.includes(opts.expectedRef)) {
    throw new Error(
      `[${opts.label}] DIRECT_URL does not reference the expected project ref "${opts.expectedRef}".\n` +
        `  Got: ${maskUrl(direct)}\n` +
        `  ${opts.hint}`,
    );
  }

  // Cross-consistency check: both URLs must point at the same project.
  // Defends against mismatched Secret Manager pulls (one env's DATABASE_URL
  // accidentally exported alongside another env's DIRECT_URL).
  const databaseRef = extractProjectRef(database);
  const directRef = extractProjectRef(direct);
  if (databaseRef && directRef && databaseRef !== directRef) {
    throw new Error(
      `[${opts.label}] DATABASE_URL and DIRECT_URL reference different Supabase projects.\n` +
        `  DATABASE_URL project ref: "${databaseRef}"\n` +
        `  DIRECT_URL project ref:   "${directRef}"\n` +
        `  Both must come from the same env's Secret Manager project.\n` +
        `  ${opts.hint}`,
    );
  }
}

/**
 * Extract the Supabase project ref from a postgres URL. Supports both
 * direct (`db.<ref>.supabase.co`) and pooler (`postgres.<ref>:…@…pooler…`)
 * formats. Returns null if no ref is recognizable.
 *
 * Exported for test coverage.
 */
export function extractProjectRef(url: string): string | null {
  // Pooler form: `postgresql://postgres.<ref>:pw@aws-0-…pooler.supabase.com:6543/postgres`
  const pooler = url.match(/postgres\.([a-z0-9]+):/i);
  if (pooler) return pooler[1];
  // Direct form: `postgresql://postgres:pw@db.<ref>.supabase.co:5432/postgres`
  const direct = url.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (direct) return direct[1];
  return null;
}

/**
 * Replace the password segment of a postgres URL with `***` so it can appear
 * safely in thrown error messages. Handles both `:pw@` and `://user:pw@`
 * forms.
 *
 * Exported for test coverage. Internal callers embed the result in thrown
 * errors.
 */
export function maskUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}
