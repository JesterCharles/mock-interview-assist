import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('GET /api/coding/status', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns { enabled: true } when flag is "true"', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'true');
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: true });
  });

  it('returns { enabled: false } when flag is "false"', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'false');
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
  });

  it('returns { enabled: false } when flag is unset/empty', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', '');
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ enabled: false });
  });

  it('sets Cache-Control: public, s-maxage=60', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'true');
    const { GET } = await import('./route');
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=60');
  });

  it('does not require authentication (public probe — 200 with no session)', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'true');
    const { GET } = await import('./route');
    const res = await GET();
    // Key invariant: never 401/403 — this is the probe.
    expect(res.status).toBe(200);
  });
});
