/**
 * Judge0 HTTP client — the ONLY route from app code to Judge0.
 *
 * Locked contract (Phase 38 Plan 02 / D-11..D-15):
 *   - submit(opts): POST async submission, returns { token }
 *   - getSubmission(token): GET submission result
 *   - systemInfo(timeoutMs): GET /system_info, used by /api/health
 *
 * Guarantees:
 *   - Reads JUDGE0_URL + JUDGE0_AUTH_TOKEN lazily at call time (friendlier for tests)
 *   - X-Auth-Token header on every request (D-10)
 *   - 1 retry on 5xx or timeout with 1-sec backoff; NO retry on 4xx (D-12)
 *   - NO blocking-wait param — async submit + poll only (D-11, CONTEXT specifics)
 *   - 6-language allowlist (Judge0Language union) via JUDGE0_LANGUAGE_MAP
 *   - Typed errors: UnsupportedLanguageError, Judge0UnavailableError, Judge0ConfigError
 *
 * Phase 39 consumers MUST import from this module — never direct fetch to JUDGE0_URL.
 */

import {
  CodingFeatureDisabledError,
  Judge0ConfigError,
  Judge0UnavailableError,
  UnsupportedLanguageError,
} from './judge0Errors';
import { isCodingEnabled } from './codingFeatureFlag';

// ---------------------------------------------------------------------------
// Language allowlist (D-14)
// ---------------------------------------------------------------------------

export type Judge0Language = 'python' | 'javascript' | 'typescript' | 'java' | 'sql' | 'csharp';

/**
 * Pinned Judge0 language IDs (Judge0 1.13.x defaults).
 * NOTE (D-14): Plan 38-03 spike verifies against live /languages endpoint.
 * Update values here if Judge0 1.13.x reassigned IDs.
 *
 * sql: verified against Judge0 1.13.1 pinned-tag reference languages list on
 * 2026-04-18 (Phase 42 Plan 01 Task 3a). Docker daemon unavailable at
 * execution time — verification followed CONTEXT fallback option 3 (pinned
 * tag reference). Live /languages re-verification is still pending as part
 * of the deferred Phase 38 SPIKE-VERIFICATION gate.
 */
export const JUDGE0_LANGUAGE_MAP: Record<Judge0Language, number> = {
  python: 71, // Python 3.8.1
  javascript: 63, // JavaScript (Node.js 12.14.0)
  typescript: 74, // TypeScript 3.7.4
  java: 62, // Java OpenJDK 13.0.1
  sql: 82, // SQL (SQLite 3.27.2) — verified against Judge0 1.13.1 on 2026-04-18
  csharp: 51, // C# Mono 6.6.0.161
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SubmitOptions {
  sourceCode: string;
  language: Judge0Language;
  stdin?: string;
  expectedStdout?: string;
  cpuTimeLimit?: number;
  memoryLimit?: number;
}

export interface Judge0Submission {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
  exit_code: number | null;
}

export interface Judge0SystemInfo {
  version?: string;
  homepage?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getEnv(): { url: string; token: string } {
  const url = process.env.JUDGE0_URL;
  const token = process.env.JUDGE0_AUTH_TOKEN;
  if (!url) throw new Judge0ConfigError('JUDGE0_URL');
  if (!token) throw new Judge0ConfigError('JUDGE0_AUTH_TOKEN');
  return { url: url.replace(/\/$/, ''), token };
}

function isAbortLike(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}

function isNetworkError(err: unknown): boolean {
  // fetch() network-level failure surfaces as TypeError in Node/undici.
  return err instanceof TypeError;
}

function shouldRetry(err: unknown): boolean {
  if (isAbortLike(err) || isNetworkError(err)) return true;
  if (err instanceof Judge0UnavailableError) return !err.http4xx;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, backoffMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!shouldRetry(err)) throw err;
    await new Promise((r) => setTimeout(r, backoffMs));
    return fn();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit source code for asynchronous execution. Returns token; caller polls
 * getSubmission() until status.id >= 3.
 *
 * Rejects with:
 *   - UnsupportedLanguageError: language not in allowlist
 *   - Judge0ConfigError: JUDGE0_URL or JUDGE0_AUTH_TOKEN unset
 *   - Judge0UnavailableError: 4xx (no retry) or 2 consecutive 5xx/timeout
 */
export async function submit(opts: SubmitOptions): Promise<{ token: string }> {
  // Phase 50 (JUDGE-INTEG-02 / D-04): fires BEFORE language + env validation
  // so the placeholder JUDGE0_URL/JUDGE0_AUTH_TOKEN values (v1.5 Secret
  // Manager content) never surface as Judge0ConfigError when the feature is
  // flag-dark. Defense-in-depth against missed API-route guards.
  if (!isCodingEnabled()) {
    throw new CodingFeatureDisabledError();
  }
  if (!(opts.language in JUDGE0_LANGUAGE_MAP)) {
    throw new UnsupportedLanguageError(opts.language);
  }
  const { url, token } = getEnv();
  return withRetry(async () => {
    const res = await fetch(`${url}/submissions?base64_encoded=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({
        source_code: opts.sourceCode,
        language_id: JUDGE0_LANGUAGE_MAP[opts.language],
        stdin: opts.stdin ?? '',
        expected_output: opts.expectedStdout ?? null,
        cpu_time_limit: opts.cpuTimeLimit ?? 10,
        memory_limit: opts.memoryLimit ?? 256000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status >= 400 && res.status < 500) {
      const body = await safeText(res);
      throw new Judge0UnavailableError(`HTTP ${res.status}: ${body}`, { http4xx: true });
    }
    if (!res.ok) throw new Judge0UnavailableError(`HTTP ${res.status}`);
    return res.json() as Promise<{ token: string }>;
  });
}

/** Fetch submission result by token. */
export async function getSubmission(submissionToken: string): Promise<Judge0Submission> {
  if (!isCodingEnabled()) {
    throw new CodingFeatureDisabledError();
  }
  const { url, token } = getEnv();
  return withRetry(async () => {
    const res = await fetch(
      `${url}/submissions/${encodeURIComponent(submissionToken)}?base64_encoded=false`,
      {
        headers: { 'X-Auth-Token': token },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (res.status >= 400 && res.status < 500) {
      const body = await safeText(res);
      throw new Judge0UnavailableError(`HTTP ${res.status}: ${body}`, { http4xx: true });
    }
    if (!res.ok) throw new Judge0UnavailableError(`HTTP ${res.status}`);
    return res.json() as Promise<Judge0Submission>;
  });
}

/**
 * Reachability probe. Used by /api/health with a short timeout.
 * NO retry — probes must be snappy; one timeout = unreachable.
 */
export async function systemInfo(timeoutMs = 2000): Promise<Judge0SystemInfo> {
  if (!isCodingEnabled()) {
    throw new CodingFeatureDisabledError();
  }
  const { url, token } = getEnv();
  try {
    const res = await fetch(`${url}/system_info`, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Judge0UnavailableError(`HTTP ${res.status}`);
    return (await res.json()) as Judge0SystemInfo;
  } catch (err) {
    if (err instanceof Judge0UnavailableError) throw err;
    throw new Judge0UnavailableError(err);
  }
}

/**
 * WR-02: Cap response-body reads at 500 chars to prevent log bloat and to
 * limit exposure if a misconfigured Judge0 ever echoes back request headers
 * (e.g., X-Auth-Token) or request body in a 4xx/5xx error response.
 * Appends a `[truncated]` marker when truncation occurs so logs are honest
 * about the cut.
 */
const SAFE_TEXT_MAX = 500;

async function safeText(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (body.length <= SAFE_TEXT_MAX) return body;
    return `${body.slice(0, SAFE_TEXT_MAX)}...[truncated]`;
  } catch {
    return '';
  }
}
