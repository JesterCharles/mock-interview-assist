import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Phase 48 / OBS-03 — Prometheus-compatible metrics endpoint (stub).
 *
 * D-11: feature-flagged via NEXT_PUBLIC_METRICS_ENABLED. Default OFF:
 *   - undefined → 404
 *   - literal 'true' (lowercase) → 200 with Prometheus text 0.0.4
 *   - anything else ('TRUE', '1', 'yes') → 404 (strict equality per OWASP default-deny)
 *
 * D-10: 4 metrics land as zero-valued stubs in Phase 48. Phase 49+ wires
 *       real instrumentation into middleware/routes.
 *
 * Spec: https://prometheus.io/docs/instrumenting/exposition_formats/
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_METRICS_ENABLED !== 'true') {
    return new NextResponse(null, { status: 404 });
  }

  const body = [
    '# HELP nlm_http_requests_total Total number of HTTP requests served',
    '# TYPE nlm_http_requests_total counter',
    'nlm_http_requests_total 0',
    '# HELP nlm_http_request_duration_seconds HTTP request latency in seconds',
    '# TYPE nlm_http_request_duration_seconds histogram',
    'nlm_http_request_duration_seconds_count 0',
    'nlm_http_request_duration_seconds_sum 0',
    '# HELP nlm_active_sessions Currently active interview sessions',
    '# TYPE nlm_active_sessions gauge',
    'nlm_active_sessions 0',
    '# HELP nlm_session_completions_total Total number of completed interview sessions',
    '# TYPE nlm_session_completions_total counter',
    'nlm_session_completions_total 0',
    '',
  ].join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
