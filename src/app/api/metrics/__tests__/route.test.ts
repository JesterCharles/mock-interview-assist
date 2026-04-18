import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('GET /api/metrics', () => {
  const originalFlag = process.env.NEXT_PUBLIC_METRICS_ENABLED;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_METRICS_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_METRICS_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_METRICS_ENABLED = originalFlag;
    }
  });

  async function getHandler() {
    const mod = await import('../route');
    return mod.GET;
  }

  it('returns 404 when flag is unset (D-11 default off)', async () => {
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 404 when flag is false', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = 'false';
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 404 when flag is TRUE (wrong case — strict equality)', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = 'TRUE';
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 404 when flag is "1"', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = '1';
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 200 with Prometheus content-type when flag is literal "true"', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = 'true';
    const GET = await getHandler();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('content-type')).toContain('version=0.0.4');
  });

  it('body contains all 4 metrics per D-10', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = 'true';
    const GET = await getHandler();
    const res = await GET();
    const body = await res.text();
    expect(body).toMatch(/^# HELP nlm_http_requests_total/m);
    expect(body).toMatch(/^# TYPE nlm_http_requests_total counter/m);
    expect(body).toMatch(/^nlm_http_requests_total 0/m);
    expect(body).toMatch(/^# HELP nlm_http_request_duration_seconds/m);
    expect(body).toMatch(/^# TYPE nlm_http_request_duration_seconds histogram/m);
    expect(body).toMatch(/^# HELP nlm_active_sessions/m);
    expect(body).toMatch(/^# TYPE nlm_active_sessions gauge/m);
    expect(body).toMatch(/^nlm_active_sessions 0/m);
    expect(body).toMatch(/^# HELP nlm_session_completions_total/m);
    expect(body).toMatch(/^# TYPE nlm_session_completions_total counter/m);
    expect(body).toMatch(/^nlm_session_completions_total 0/m);
  });

  it('body ends with a newline (Prometheus spec requirement)', async () => {
    process.env.NEXT_PUBLIC_METRICS_ENABLED = 'true';
    const GET = await getHandler();
    const res = await GET();
    const body = await res.text();
    expect(body.endsWith('\n')).toBe(true);
  });
});
