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
 */

/** Staging Supabase project ref — constant per STATE.md v1.5 direction. */
export const STAGING_REF = 'lzuqbpqmqlvzwebliptj';

/**
 * Refuses to proceed unless DATABASE_URL contains the staging project ref.
 * Throws a loud error — exits non-zero when called from a top-level script.
 *
 * Error messages embed maskUrl() output (never the raw URL, to avoid
 * leaking credentials into log streams).
 */
export function assertStagingDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error(
      `[assert-staging] REFUSING to run: DATABASE_URL env var is unset.\n` +
        `  Fix: export DATABASE_URL + DIRECT_URL from the staging Secret Manager project.\n` +
        `  See docs/ENV-HYGIENE.md.`,
    );
  }
  if (!url.includes(STAGING_REF)) {
    throw new Error(
      `[assert-staging] REFUSING to run: DATABASE_URL does not reference staging ref "${STAGING_REF}".\n` +
        `  Got: ${maskUrl(url)}\n` +
        `  Fix: export DATABASE_URL + DIRECT_URL from the staging Secret Manager project.\n` +
        `  See docs/ENV-HYGIENE.md.`,
    );
  }
}

/**
 * Inverse of assertStagingDatabase — refuses to run unless DATABASE_URL points
 * at the expected production project ref AND does NOT contain the staging ref.
 *
 * Used by scripts/wipe-prod.ts. The inverted semantics prevent a classic
 * operator mistake: running the prod-wipe script against staging.
 */
export function assertProdDatabase(expectedProdRef: string): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error(
      `[assert-prod] REFUSING to run: DATABASE_URL env var is unset.\n` +
        `  Fix: export DATABASE_URL from the prod Secret Manager project.`,
    );
  }
  if (url.includes(STAGING_REF)) {
    throw new Error(
      `[assert-prod] REFUSING to run against STAGING. This is the prod-wipe path; DATABASE_URL must point at prod.\n` +
        `  Got: ${maskUrl(url)}`,
    );
  }
  if (!url.includes(expectedProdRef)) {
    throw new Error(
      `[assert-prod] DATABASE_URL does not reference the expected prod project ref "${expectedProdRef}".\n` +
        `  Got: ${maskUrl(url)}`,
    );
  }
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
