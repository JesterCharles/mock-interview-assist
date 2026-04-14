/**
 * Unit tests for readinessService.ts
 *
 * Tests classification logic, trend computation, and recommended area derivation.
 * Prisma is mocked — no DB connection required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Prisma mock setup ---
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gapScore: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
    },
    session: {
      count: mockCount,
      findMany: mockFindMany,
    },
    associate: {
      findMany: mockFindMany,
      update: mockUpdate,
    },
  },
}));

// Import after mocking
import {
  computeReadiness,
  recomputeAllReadiness,
  updateAssociateReadiness,
  computeTrend,
} from '@/lib/readinessService';

// --- Helpers ---
function makeGapScore(skill: string, topic: string, weightedScore: number) {
  return { skill, topic, weightedScore, id: `gap-${skill}-${topic}`, associateId: 1, sessionCount: 1, lastUpdated: new Date() };
}

function makeSession(overallTechnicalScore: number | null, overallSoftSkillScore: number | null, createdAt: Date) {
  return { id: `session-${createdAt.toISOString()}`, overallTechnicalScore, overallSoftSkillScore, createdAt };
}

// Helper: configure prisma mocks for a specific test scenario
function setupMocks({
  sessionCount = 3,
  skillGapScores = [] as ReturnType<typeof makeGapScore>[],
  topicGapScores = [] as ReturnType<typeof makeGapScore>[],
  recentSessions = [] as ReturnType<typeof makeSession>[],
} = {}) {
  // prisma.session.count
  mockCount.mockResolvedValue(sessionCount);
  // prisma.session.findMany (for computeTrend)
  // prisma.gapScore.findMany (for skill-level gaps) and associate.findMany (for recompute)
  // We need to differentiate calls — use mockImplementation based on call args
  mockFindMany.mockImplementation((args: Record<string, unknown>) => {
    const where = args?.where as Record<string, unknown> | undefined;
    // session findMany: where.associateId exists and NO 'skill' field
    if (where && 'associateId' in where && !('skill' in where) && args?.select) {
      return Promise.resolve(recentSessions);
    }
    // gapScore.findMany with topic: "" filter (skill-level)
    if (where && where.topic === '') {
      return Promise.resolve(skillGapScores);
    }
    // associate.findMany (no where.associateId with select pattern)
    if (!where || (!('associateId' in where))) {
      return Promise.resolve([{ id: 1 }, { id: 2 }]);
    }
    return Promise.resolve([]);
  });

  // prisma.gapScore.findFirst (for recommended area — lowest topic score)
  mockFindFirst.mockImplementation((args: Record<string, unknown>) => {
    const where = args?.where as Record<string, unknown> | undefined;
    if (where && where.topic && (where.topic as Record<string, unknown>).not === '') {
      return Promise.resolve(topicGapScores.length > 0 ? topicGapScores[0] : null);
    }
    return Promise.resolve(null);
  });

  mockUpdate.mockResolvedValue({});
}

// --- Tests ---

describe('computeTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns -1 when fewer than 3 sessions exist', async () => {
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([
      makeSession(80, 70, new Date('2024-01-01')),
      makeSession(85, 75, new Date('2024-01-08')),
    ]);
    const result = await computeTrend(1);
    expect(result).toBe(-1);
  });

  it('computes slope of last 3 sessions (oldest to newest)', async () => {
    // Scores: 60, 70, 80 — positive slope expected
    const sessions = [
      makeSession(80, 80, new Date('2024-01-15')), // newest (DESC order)
      makeSession(70, 70, new Date('2024-01-08')),
      makeSession(60, 60, new Date('2024-01-01')), // oldest
    ];
    mockFindMany.mockResolvedValue(sessions);
    const result = await computeTrend(1);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for flat trend (all same scores)', async () => {
    const sessions = [
      makeSession(75, 75, new Date('2024-01-15')),
      makeSession(75, 75, new Date('2024-01-08')),
      makeSession(75, 75, new Date('2024-01-01')),
    ];
    mockFindMany.mockResolvedValue(sessions);
    const result = await computeTrend(1);
    expect(result).toBe(0);
  });

  it('returns negative slope for declining trend', async () => {
    const sessions = [
      makeSession(60, 60, new Date('2024-01-15')), // newest
      makeSession(70, 70, new Date('2024-01-08')),
      makeSession(80, 80, new Date('2024-01-01')), // oldest
    ];
    mockFindMany.mockResolvedValue(sessions);
    const result = await computeTrend(1);
    expect(result).toBeLessThan(0);
  });
});

describe('computeReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not_ready with null recommendedArea when associate has fewer than 3 sessions', async () => {
    mockCount.mockResolvedValue(2);
    // No other calls expected
    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('not_ready');
    expect(result.recommendedArea).toBeNull();
    expect(result.lastComputedAt).toBeInstanceOf(Date);
  });

  it('returns ready when avg >= threshold, sessions >= 3, trend slope >= 0', async () => {
    mockCount.mockResolvedValue(5);
    // Skill-level gap scores averaging 80 (above threshold of 75)
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      // session.findMany for trend
      if (args?.select && where && 'associateId' in where) {
        return Promise.resolve([
          makeSession(80, 80, new Date('2024-01-15')),
          makeSession(78, 78, new Date('2024-01-08')),
          makeSession(76, 76, new Date('2024-01-01')),
        ]);
      }
      // gapScore.findMany for skill-level
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 80),
          makeGapScore('TypeScript', '', 82),
        ]);
      }
      return Promise.resolve([]);
    });
    mockFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 78));

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('ready');
    expect(result.recommendedArea).not.toBeNull();
  });

  it('returns improving when sessions >= 3, trend > 0 (strictly positive), avg < threshold', async () => {
    mockCount.mockResolvedValue(4);
    // Skill-level gap scores averaging 65 (below threshold of 75)
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        // Increasing trend: 60, 65, 70
        return Promise.resolve([
          makeSession(70, 70, new Date('2024-01-15')),
          makeSession(65, 65, new Date('2024-01-08')),
          makeSession(60, 60, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 65),
        ]);
      }
      return Promise.resolve([]);
    });
    mockFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 65));

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('improving');
  });

  it('returns not_ready when sessions >= 3, trend < 0 (negative trend)', async () => {
    mockCount.mockResolvedValue(4);
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        // Declining trend: 80, 70, 60
        return Promise.resolve([
          makeSession(60, 60, new Date('2024-01-15')),
          makeSession(70, 70, new Date('2024-01-08')),
          makeSession(80, 80, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 65),
        ]);
      }
      return Promise.resolve([]);
    });
    mockFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('not_ready');
  });

  it('returns not_ready when sessions >= 3, trend == 0 (flat), avg < threshold', async () => {
    mockCount.mockResolvedValue(4);
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        // Flat trend: all 65
        return Promise.resolve([
          makeSession(65, 65, new Date('2024-01-15')),
          makeSession(65, 65, new Date('2024-01-08')),
          makeSession(65, 65, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 65),
        ]);
      }
      return Promise.resolve([]);
    });
    mockFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    // Flat trend (slope=0) with avg < threshold is NOT improving (improving requires trend > 0)
    expect(result.status).toBe('not_ready');
  });

  it('uses the passed threshold parameter, not a hardcoded 75', async () => {
    mockCount.mockResolvedValue(4);
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        // Flat/positive trend
        return Promise.resolve([
          makeSession(85, 85, new Date('2024-01-15')),
          makeSession(83, 83, new Date('2024-01-08')),
          makeSession(81, 81, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 83),
        ]);
      }
      return Promise.resolve([]);
    });
    mockFindFirst.mockResolvedValue(null);

    // With threshold=90, avg of 83 should NOT be ready
    const result90 = await computeReadiness(1, 90);
    expect(result90.status).not.toBe('ready');

    // With threshold=80, avg of 83 should be ready (trend is positive)
    const result80 = await computeReadiness(1, 80);
    expect(result80.status).toBe('ready');
  });

  it('recommendedArea equals lowest weighted topic-level gap score topic', async () => {
    mockCount.mockResolvedValue(4);
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        return Promise.resolve([
          makeSession(80, 80, new Date('2024-01-15')),
          makeSession(78, 78, new Date('2024-01-08')),
          makeSession(76, 76, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 78),
        ]);
      }
      return Promise.resolve([]);
    });
    // Lowest topic score is 'hooks' at 55
    mockFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 55));

    const result = await computeReadiness(1, 75);
    expect(result.recommendedArea).toBe('hooks');
  });

  it('recommendedArea falls back to lowest skill name when no topic-level scores exist', async () => {
    mockCount.mockResolvedValue(4);
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      const where = args?.where as Record<string, unknown> | undefined;
      if (args?.select && where && 'associateId' in where) {
        return Promise.resolve([
          makeSession(80, 80, new Date('2024-01-15')),
          makeSession(78, 78, new Date('2024-01-08')),
          makeSession(76, 76, new Date('2024-01-01')),
        ]);
      }
      if (where?.topic === '') {
        return Promise.resolve([
          makeGapScore('React', '', 60), // lowest skill
          makeGapScore('TypeScript', '', 75),
        ]);
      }
      return Promise.resolve([]);
    });
    // No topic-level scores
    mockFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    // Fall back: lowest skill-level score is 'React' at 60
    expect(result.recommendedArea).toBe('React');
  });
});

describe('recomputeAllReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls computeReadiness for every associate in the DB and updates each', async () => {
    // Mock associate.findMany to return 2 associates
    const associates = [{ id: 1 }, { id: 2 }];
    // We set up mocks per call sequence
    // associate.findMany
    let findManyCallCount = 0;
    mockFindMany.mockImplementation((args: Record<string, unknown>) => {
      findManyCallCount++;
      const where = args?.where as Record<string, unknown> | undefined;
      // First call: associate.findMany (no where with associateId)
      if (!where || (!('associateId' in where) && !('topic' in where))) {
        return Promise.resolve(associates);
      }
      // session.count calls handled separately via mockCount
      // skill-level gap scores
      if (where?.topic === '') {
        return Promise.resolve([makeGapScore('React', '', 50)]);
      }
      // session.findMany
      if (args?.select && where && 'associateId' in where) {
        return Promise.resolve([
          makeSession(50, 50, new Date('2024-01-15')),
          makeSession(50, 50, new Date('2024-01-08')),
          makeSession(50, 50, new Date('2024-01-01')),
        ]);
      }
      return Promise.resolve([]);
    });
    mockCount.mockResolvedValue(3);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({});

    await recomputeAllReadiness(75);

    // Should have called update at least once per associate
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    // Each update should include readinessStatus
    const calls = mockUpdate.mock.calls;
    calls.forEach((call: unknown[]) => {
      const args = call[0] as { data: { readinessStatus: string } };
      expect(args.data).toHaveProperty('readinessStatus');
    });
  });
});
