import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/rateLimitService', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/sessionPersistence', () => ({
  persistSessionToDb: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  getAssociateSession: vi.fn(),
}));

vi.mock('@/lib/readinessPipeline', () => ({
  runReadinessPipeline: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from './route';
import { checkRateLimit } from '@/lib/rateLimitService';
import { persistSessionToDb } from '@/lib/sessionPersistence';
import { getAssociateSession } from '@/lib/auth-server';
import { runReadinessPipeline } from '@/lib/readinessPipeline';

const mockCheckRateLimit = checkRateLimit as unknown as ReturnType<typeof vi.fn>;
const mockPersist = persistSessionToDb as unknown as ReturnType<typeof vi.fn>;
const mockGetAssocSession = getAssociateSession as unknown as ReturnType<typeof vi.fn>;
const mockRunPipeline = runReadinessPipeline as unknown as ReturnType<typeof vi.fn>;

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-auth-1',
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

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/associate/interview/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/associate/interview/complete', () => {
  beforeEach(() => {
    mockCheckRateLimit.mockReset().mockReturnValue({ allowed: true, nextReset: new Date() });
    mockPersist.mockReset().mockResolvedValue(true);
    mockGetAssocSession.mockReset();
    mockRunPipeline.mockReset().mockResolvedValue(undefined);
  });

  it('Test 1: no cookie -> 401', async () => {
    mockGetAssocSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(401);
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockRunPipeline).not.toHaveBeenCalled();
  });

  it('Test 2: stale cookie (returns null) -> 401', async () => {
    mockGetAssocSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(401);
  });

  it('Test 3: valid cookie -> 200, persist with cookie slug, pipeline invoked', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(200);
    const persisted = mockPersist.mock.calls[0][0];
    expect(persisted.associateSlug).toBe('alice');
    expect(mockRunPipeline).toHaveBeenCalledWith(77, 'sess-auth-1');
  });

  it('Test 4: client-supplied attacker-slug is OVERRIDDEN by cookie slug', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const res = await POST(
      makeReq({ fingerprint: 'fp', session: baseSession({ associateSlug: 'attacker' }) }),
    );
    expect(res.status).toBe(200);
    const persisted = mockPersist.mock.calls[0][0];
    expect(persisted.associateSlug).toBe('alice');
    expect(persisted.associateSlug).not.toBe('attacker');
  });

  it('Test 5: persistSessionToDb returns false -> 500; pipeline NOT called', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    mockPersist.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(500);
    expect(mockRunPipeline).not.toHaveBeenCalled();
  });

  it('Test 6: invalid session shape -> 400', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const res = await POST(makeReq({ fingerprint: 'fp', session: { id: 'x' } }));
    expect(res.status).toBe(400);
  });

  it('Test 7: oversized payload -> 413', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const huge = 'x'.repeat(600_000);
    const res = await POST(
      makeReq({ fingerprint: 'fp', session: baseSession({ technicalFeedback: huge }) }),
    );
    expect(res.status).toBe(413);
  });

  it('Test 8: rate-limit rejection -> 429', async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, nextReset: new Date() });
    // Even if auth valid, rate limit wins before persistence
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(429);
    expect(mockPersist).not.toHaveBeenCalled();
    expect(mockRunPipeline).not.toHaveBeenCalled();
  });

  it('enforces mode=automated on persisted session', async () => {
    mockGetAssocSession.mockResolvedValueOnce({ associateId: 77, slug: 'alice' });
    const res = await POST(makeReq({ fingerprint: 'fp', session: baseSession() }));
    expect(res.status).toBe(200);
    // mode is now passed via the options arg, not stamped onto the session
    // payload — prevents it getting lost when persistSessionToDb writes columns.
    const options = mockPersist.mock.calls[0][1];
    expect(options).toEqual({ mode: 'automated' });
  });
});
