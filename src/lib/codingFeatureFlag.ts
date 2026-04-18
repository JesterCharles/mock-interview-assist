/**
 * Phase 50 (JUDGE-INTEG-01 / D-02): single source of truth for the
 * CODING_CHALLENGES_ENABLED feature flag.
 *
 * Strict === 'true' match per Phase 48 /api/metrics precedent. Uppercase
 * 'TRUE' is intentionally rejected so ops cannot accidentally enable via
 * case-insensitive tooling.
 *
 * In v1.5 prod this flag is 'false' (coding stack flag-dark).
 * In v1.5 staging it is 'true' (dev/testing continues).
 * In v1.6 it flips to 'true' in prod when the Judge0 VPC connector lands.
 */

export { CodingFeatureDisabledError } from './judge0Errors';

/** User-facing copy — aligned across API 503 bodies + UI ComingSoon card. */
export const CODING_COMING_SOON_MESSAGE =
  'Coding challenges coming soon. Check back later!';

/**
 * Server-side flag check. Reads env lazily at call time so tests can stub.
 */
export function isCodingEnabled(): boolean {
  return process.env.CODING_CHALLENGES_ENABLED === 'true';
}
