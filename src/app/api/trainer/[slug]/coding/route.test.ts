/**
 * Unit tests for GET /api/trainer/[slug]/coding (Phase 41 Plan 02 Task 1).
 *
 * Auth gates, slug validation, 404 handling, response shape, hidden-test
 * shield (response keys ⊆ allowlist), empty skillScores when no
 * coding:% topics exist.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    associate: { findUnique: vi.fn() },
    codingAttempt: { findMany: vi.fn() },
    gapScore: { findMany: vi.fn() },
  };
  return { prisma: mockPrisma };
});

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { GET } from '@/app/api/trainer/[slug]/coding/route';

const mockAssoc = prisma.associate.findUnique as ReturnType<typeof vi.fn>;
const mockAttempts = prisma.codingAttempt.findMany as ReturnType<typeof vi.fn>;
const mockGap = prisma.gapScore.findMany as ReturnType<typeof vi.fn>;
const mockAuth = getCallerIdentity as ReturnType<typeof vi.fn>;

function makeCtx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}
function req() {
  return new Request('http://localhost/api/trainer/any/coding');
}

const ALLOWED_KEYS = new Set([
  'id',
  'submittedAt',
  'challengeSlug',
  'challengeTitle',
  'language',
  'difficulty',
  'verdict',
  'score',
]);

describe('GET /api/trainer/[slug]/coding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when caller is anonymous', async () => {
    mockAuth.mockResolvedValue({ kind: 'anonymous' });
    const res = await GET(req(), makeCtx('jane'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when caller is an associate (even matching slug) — trainer-only per D-07', async () => {
    mockAuth.mockResolvedValue({
      kind: 'associate',
      associateId: 1,
      slug: 'jane',
      userId: 'u-1',
      email: 'jane@test.com',
    });
    const res = await GET(req(), makeCtx('jane'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid slug characters', async () => {
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u', email: 't@t.co' });
    const res = await GET(req(), makeCtx('BAD SLUG!'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when associate not found', async () => {
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u', email: 't@t.co' });
    mockAssoc.mockResolvedValue(null);
    const res = await GET(req(), makeCtx('missing'));
    expect(res.status).toBe(404);
  });

  it('returns 200 with attempts + codingSkillScores for trainer caller', async () => {
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u', email: 't@t.co' });
    mockAssoc.mockResolvedValue({ id: 42, slug: 'jane' });

    mockAttempts.mockResolvedValue([
      {
        id: 'a1',
        submittedAt: new Date('2026-04-17T12:00:00Z'),
        language: 'python',
        verdict: 'pass',
        score: 100,
        challenge: { slug: 'two-sum', title: 'Two Sum', difficulty: 'medium' },
      },
      {
        id: 'a2',
        submittedAt: new Date('2026-04-16T10:00:00Z'),
        language: 'typescript',
        verdict: 'fail',
        score: 40,
        challenge: { slug: 'reverse-string', title: 'Reverse String', difficulty: 'easy' },
      },
    ]);
    mockGap.mockResolvedValue([
      { skill: 'python-fundamentals', topic: 'coding:python', weightedScore: 120, sessionCount: 2 },
      { skill: 'python-fundamentals', topic: 'coding:typescript', weightedScore: 40, sessionCount: 1 },
      { skill: 'algorithms', topic: 'coding:python', weightedScore: 80, sessionCount: 3 },
    ]);

    const res = await GET(req(), makeCtx('jane'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.attempts).toHaveLength(2);
    // Response shape — whitelist assertion (hidden-test shield)
    for (const a of body.attempts) {
      expect(new Set(Object.keys(a)).size).toBe(Object.keys(a).length);
      for (const k of Object.keys(a)) expect(ALLOWED_KEYS.has(k)).toBe(true);
    }
    expect(body.attempts[0]).toMatchObject({
      id: 'a1',
      challengeSlug: 'two-sum',
      challengeTitle: 'Two Sum',
      language: 'python',
      difficulty: 'medium',
      verdict: 'pass',
      score: 100,
    });
    expect(typeof body.attempts[0].submittedAt).toBe('string');

    // Aggregated by skillSlug: python-fundamentals has two rows
    //   weighted mean: (120*2 + 40*1) / (2+1) = 280/3 ≈ 93.33
    //   attemptCount = 2 + 1 = 3
    const py = body.codingSkillScores.find((s: { skillSlug: string }) => s.skillSlug === 'python-fundamentals');
    expect(py).toBeDefined();
    expect(py.attemptCount).toBe(3);
    expect(py.score).toBeCloseTo(280 / 3, 2);

    const algo = body.codingSkillScores.find((s: { skillSlug: string }) => s.skillSlug === 'algorithms');
    expect(algo).toEqual({ skillSlug: 'algorithms', score: 80, attemptCount: 3 });
  });

  it('hidden-test shield: response does not include submittedCode / hiddenTestResults / visibleTestResults', async () => {
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u', email: 't@t.co' });
    mockAssoc.mockResolvedValue({ id: 42, slug: 'jane' });
    mockAttempts.mockResolvedValue([
      {
        id: 'a1',
        submittedAt: new Date('2026-04-17T12:00:00Z'),
        language: 'python',
        verdict: 'pass',
        score: 100,
        challenge: { slug: 'two-sum', title: 'Two Sum', difficulty: 'medium' },
      },
    ]);
    mockGap.mockResolvedValue([]);

    const res = await GET(req(), makeCtx('jane'));
    const body = await res.json();
    for (const a of body.attempts) {
      expect(a).not.toHaveProperty('submittedCode');
      expect(a).not.toHaveProperty('hiddenTestResults');
      expect(a).not.toHaveProperty('visibleTestResults');
      expect(a).not.toHaveProperty('judge0Token');
    }
  });

  it('codingSkillScores empty when no topic LIKE "coding:%" rows exist', async () => {
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u', email: 't@t.co' });
    mockAssoc.mockResolvedValue({ id: 42, slug: 'jane' });
    mockAttempts.mockResolvedValue([]);
    mockGap.mockResolvedValue([]);

    const res = await GET(req(), makeCtx('jane'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempts).toEqual([]);
    expect(body.codingSkillScores).toEqual([]);
  });
});
