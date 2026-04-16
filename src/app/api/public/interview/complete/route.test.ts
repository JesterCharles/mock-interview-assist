import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/rateLimitService', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/sessionPersistence', () => ({
  persistSessionToDb: vi.fn(),
}));

import { POST } from './route';
import { checkRateLimit } from '@/lib/rateLimitService';
import { persistSessionToDb } from '@/lib/sessionPersistence';

const mockCheckRateLimit = checkRateLimit as unknown as ReturnType<typeof vi.fn>;
const mockPersist = persistSessionToDb as unknown as ReturnType<typeof vi.fn>;

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    status: 'completed',
    questions: [],
    questionCount: 0,
    starterQuestions: [],
    assessments: {},
    currentQuestionIndex: 0,
    selectedWeeks: [],
    date: '2026-04-14',
    ...overrides,
  };
}

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/public/interview/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/public/interview/complete (hardened)', () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset().mockReturnValue({ allowed: true, nextReset: new Date() });
    mockPersist.mockReset().mockResolvedValue(true);
  });

  it('Test 1: no associateSlug in payload -> 200, associateId null, no fan-out', async () => {
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, persisted: 'db' });
    const passed = mockPersist.mock.calls[0][0];
    expect(passed.associateSlug).toBeNull();
  });

  it('Test 2: associateSlug:"victim" in payload -> stripped to null before persist', async () => {
    const res = await POST(makeReq({
      fingerprint: 'fp',
      session: baseSession({ associateSlug: 'victim' }),
    }));
    expect(res.status).toBe(200);
    const passed = mockPersist.mock.calls[0][0];
    expect(passed.associateSlug).toBeNull();
    // Critical security regression guard — NO way to pass a non-null slug through
    expect(passed.associateSlug).not.toBe('victim');
  });

  it('Test 3: associateSlug + cookie header present -> still stripped (ignores cookies)', async () => {
    const res = await POST(
      makeReq(
        { fingerprint: 'fp', session: baseSession({ associateSlug: 'victim' }) },
        { cookie: 'sb-session=anything' },
      ),
    );
    expect(res.status).toBe(200);
    const passed = mockPersist.mock.calls[0][0];
    expect(passed.associateSlug).toBeNull();
  });

  it('Test 4: rate-limit rejection -> 429 before persistence', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, nextReset: new Date() });

    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(429);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('Test 5: oversized payload -> 413', async () => {
    const huge = 'x'.repeat(600_000);
    const res = await POST(
      makeReq({ fingerprint: 'fp', session: baseSession({ technicalFeedback: huge }) }),
    );
    expect(res.status).toBe(413);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('Test 6: invalid session shape -> 400', async () => {
    const res = await POST(makeReq({ fingerprint: 'fp', session: { id: 'x' } }));
    expect(res.status).toBe(400);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('Test 7: persistSessionToDb returning false -> 500', async () => {
    mockPersist.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(500);
  });
});
