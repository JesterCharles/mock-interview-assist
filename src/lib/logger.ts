/**
 * Structured JSON logger for Next Level Mock.
 *
 * Emits Cloud-Logging-compatible JSON to stdout. Cloud Run auto-parses each
 * stdout line into a structured LogEntry with `jsonPayload`.
 *
 * Per D-07, D-08, D-17:
 *   - Severity values are Cloud Logging canonical: DEBUG|INFO|WARNING|ERROR|CRITICAL.
 *   - Edge-runtime safe: uses only `console.log` + `process.env`.
 *   - Extras merged flat into payload (queryable as `jsonPayload.route="..."` etc.).
 *
 * Docs: https://cloud.google.com/logging/docs/structured-logging
 */

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

type Extras = Record<string, unknown>;

function resolveEnv(): string {
  return process.env.NLM_ENV || process.env.K_SERVICE || 'unknown';
}

function emit(severity: LogSeverity, message: string, extras?: Extras): void {
  const payload = {
    ...(extras ?? {}),
    severity,
    message,
    env: resolveEnv(),
  };
  let line: string;
  try {
    line = JSON.stringify(payload);
  } catch {
    // Circular reference or non-serializable value — fall back to a minimal entry.
    line = JSON.stringify({
      severity,
      message,
      env: resolveEnv(),
      serialize_error: 'circular',
    });
  }
  // eslint-disable-next-line no-console
  console.log(line);
}

export const log = {
  debug: (message: string, extras?: Extras) => emit('DEBUG', message, extras),
  info: (message: string, extras?: Extras) => emit('INFO', message, extras),
  warn: (message: string, extras?: Extras) => emit('WARNING', message, extras),
  error: (message: string, extras?: Extras) => emit('ERROR', message, extras),
  critical: (message: string, extras?: Extras) => emit('CRITICAL', message, extras),
};
