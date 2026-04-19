/**
 * Typed error classes for Judge0 failure modes.
 * Consumed by src/lib/judge0Client.ts and by Phase 39 route handlers for
 * typed-error → HTTP mapping.
 */

export class UnsupportedLanguageError extends Error {
  readonly name = 'UnsupportedLanguageError';
  constructor(lang: string) {
    super(`Unsupported Judge0 language: ${lang}`);
  }
}

export class Judge0UnavailableError extends Error {
  readonly name = 'Judge0UnavailableError';
  readonly http4xx: boolean;
  constructor(public readonly cause?: unknown, opts?: { http4xx?: boolean }) {
    super('Judge0 API unreachable');
    this.http4xx = Boolean(opts?.http4xx);
  }
}

export class Judge0ConfigError extends Error {
  readonly name = 'Judge0ConfigError';
  constructor(missing: string) {
    super(`Judge0 config missing: ${missing}`);
  }
}

/**
 * Phase 50 (JUDGE-INTEG-02 / D-04): thrown by every judge0Client.ts +
 * codingAttemptPoll.ts export when CODING_CHALLENGES_ENABLED !== 'true'.
 * API routes catch this and map to HTTP 503 with the "coming soon" body.
 */
export class CodingFeatureDisabledError extends Error {
  readonly name = 'CodingFeatureDisabledError';
  constructor(message = 'Coding challenges are currently disabled') {
    super(message);
  }
}
