import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/lib/judge0Client', () => ({
  systemInfo: vi.fn(),
}));

vi.mock('@/lib/codingFeatureFlag', () => ({
  isCodingEnabled: vi.fn(),
}));

// Use a minimal Judge0UnavailableError stand-in (not importing real module to avoid cycles).
class FakeJudge0Err extends Error {
  readonly name = 'Judge0UnavailableError';
}

import { prisma } from '@/lib/prisma';
import { systemInfo } from '@/lib/judge0Client';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { GET } from '../route';

const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const sysInfo = systemInfo as unknown as ReturnType<typeof vi.fn>;
const codingEnabled = isCodingEnabled as unknown as ReturnType<typeof vi.fn>;

describe('GET /api/health', () => {
  const originalJudge0Url = process.env.JUDGE0_URL;

  beforeEach(() => {
    queryRaw.mockReset();
    sysInfo.mockReset();
    codingEnabled.mockReset();
    // Default: Judge0 fully configured (flag on + URL set). Individual tests
    // override as needed to exercise the 'disabled' path.
    codingEnabled.mockReturnValue(true);
    process.env.JUDGE0_URL = 'http://judge0.example';
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalJudge0Url === undefined) {
      delete process.env.JUDGE0_URL;
    } else {
      process.env.JUDGE0_URL = originalJudge0Url;
    }
  });

  it('returns 200 + ok when db and judge0 both healthy', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    sysInfo.mockResolvedValue({ version: '1.13.1' });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      status: 'ok',
      checks: { db: 'connected', judge0: 'ok' },
      judge0Version: '1.13.1',
    });
  });

  it('returns 503 when db down and judge0 up', async () => {
    queryRaw.mockRejectedValue(new Error('db timeout'));
    sysInfo.mockResolvedValue({ version: '1.13.1' });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks.db).toBe('disconnected');
    expect(body.checks.judge0).toBe('ok');
  });

  it('returns 503 when db up and judge0 unreachable', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    sysInfo.mockRejectedValue(new FakeJudge0Err('unreachable'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks.db).toBe('connected');
    expect(body.checks.judge0).toBe('unreachable');
  });

  it('returns 503 when both down', async () => {
    queryRaw.mockRejectedValue(new Error('db down'));
    sysInfo.mockRejectedValue(new FakeJudge0Err('down'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.checks.db).toBe('disconnected');
    expect(body.checks.judge0).toBe('unreachable');
  });

  it('passes 2000ms timeout to systemInfo (D-16)', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    sysInfo.mockResolvedValue({ version: '1.13.1' });

    await GET();
    expect(sysInfo).toHaveBeenCalledWith(2000);
  });

  it('runs db + judge0 checks in parallel (not serial)', async () => {
    queryRaw.mockImplementation(
      () => new Promise((r) => setTimeout(() => r([{ '?column?': 1 }]), 120)),
    );
    sysInfo.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ version: '1.13.1' }), 120)),
    );

    const start = Date.now();
    await GET();
    const elapsed = Date.now() - start;

    // Parallel should finish ~120ms; serial would be ~240ms. Allow slack.
    expect(elapsed).toBeLessThan(200);
  });

  // ---------------------------------------------------------------------------
  // v1.5: Judge0 'disabled' path — flag-dark or JUDGE0_URL unset/empty should
  // not trip /api/health. Uptime checks must stay green until v1.6 lands.
  // ---------------------------------------------------------------------------

  it("returns 200 + judge0='disabled' when coding feature flag is dark", async () => {
    codingEnabled.mockReturnValue(false);
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks).toEqual({ db: 'connected', judge0: 'disabled' });
    expect(sysInfo).not.toHaveBeenCalled();
  });

  it("returns 200 + judge0='disabled' when JUDGE0_URL is unset", async () => {
    delete process.env.JUDGE0_URL;
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.judge0).toBe('disabled');
    expect(sysInfo).not.toHaveBeenCalled();
  });

  it("returns 200 + judge0='disabled' when JUDGE0_URL is empty string", async () => {
    process.env.JUDGE0_URL = '';
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.checks.judge0).toBe('disabled');
    expect(sysInfo).not.toHaveBeenCalled();
  });

  it("returns 503 when db disconnected even if judge0='disabled'", async () => {
    codingEnabled.mockReturnValue(false);
    queryRaw.mockRejectedValue(new Error('db down'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks.db).toBe('disconnected');
    expect(body.checks.judge0).toBe('disabled');
  });
});
