/**
 * Unit tests for readinessService.ts
 *
 * Tests classification logic, trend computation, and recommended area derivation.
 * Prisma is mocked — no DB connection required.
 *
 * Note: vi.mock factory is hoisted, so mock fns are created inside the factory
 * and accessed via the mock module reference after import.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock setup: factory must not reference outer variables (hoisting) ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    gapScore: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    session: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    associate: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

// Import AFTER vi.mock declaration
import { prisma } from '@/lib/prisma';
import {
  computeReadiness,
  recomputeAllReadiness,
  computeTrend,
} from '@/lib/readinessService';

// Typed references to mock functions for ergonomic use in tests
const mockGapFindMany = prisma.gapScore.findMany as ReturnType<typeof vi.fn>;
const mockGapFindFirst = prisma.gapScore.findFirst as ReturnType<typeof vi.fn>;
const mockSessionCount = prisma.session.count as ReturnType<typeof vi.fn>;
const mockSessionFindMany = prisma.session.findMany as ReturnType<typeof vi.fn>;
const mockAssocFindMany = prisma.associate.findMany as ReturnType<typeof vi.fn>;
const mockAssocUpdate = prisma.associate.update as ReturnType<typeof vi.fn>;

// --- Helpers ---
function makeGapScore(skill: string, topic: string, weightedScore: number) {
  return {
    id: `gap-${skill}-${topic}`,
    associateId: 1,
    skill,
    topic,
    weightedScore,
    sessionCount: 1,
    lastUpdated: new Date(),
  };
}

function makeSession(
  overallTechnicalScore: number | null,
  overallSoftSkillScore: number | null,
  createdAt: Date,
) {
  return {
    id: `session-${createdAt.toISOString()}`,
    overallTechnicalScore,
    overallSoftSkillScore,
    createdAt,
  };
}

// --- Tests ---

describe('computeTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns -1 when fewer than 3 sessions exist', async () => {
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 70, new Date('2024-01-01')),
      makeSession(85, 75, new Date('2024-01-08')),
    ]);
    const result = await computeTrend(1);
    expect(result).toBe(-1);
  });

  it('computes positive slope for improving trend (60, 70, 80 oldest-to-newest)', async () => {
    // findMany returns DESC order (newest first), function reverses them
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 80, new Date('2024-01-15')), // newest
      makeSession(70, 70, new Date('2024-01-08')),
      makeSession(60, 60, new Date('2024-01-01')), // oldest
    ]);
    const result = await computeTrend(1);
    expect(result).toBeGreaterThan(0);
  });

  it('returns 0 for flat trend (all same scores)', async () => {
    mockSessionFindMany.mockResolvedValue([
      makeSession(75, 75, new Date('2024-01-15')),
      makeSession(75, 75, new Date('2024-01-08')),
      makeSession(75, 75, new Date('2024-01-01')),
    ]);
    const result = await computeTrend(1);
    expect(result).toBe(0);
  });

  it('returns negative slope for declining trend (80, 70, 60 oldest-to-newest)', async () => {
    mockSessionFindMany.mockResolvedValue([
      makeSession(60, 60, new Date('2024-01-15')), // newest
      makeSession(70, 70, new Date('2024-01-08')),
      makeSession(80, 80, new Date('2024-01-01')), // oldest
    ]);
    const result = await computeTrend(1);
    expect(result).toBeLessThan(0);
  });
});

describe('computeReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not_ready with null recommendedArea when associate has fewer than 3 sessions', async () => {
    // Only 2 sessions returned by findMany (gate check uses findMany result length)
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 70, new Date('2024-01-01')),
      makeSession(85, 75, new Date('2024-01-08')),
    ]);
    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('not_ready');
    expect(result.recommendedArea).toBeNull();
    expect(result.lastComputedAt).toBeInstanceOf(Date);
  });

  it('returns ready when avg >= threshold, sessions >= 3, trend slope >= 0', async () => {
    // Positive trend
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 80, new Date('2024-01-15')),
      makeSession(78, 78, new Date('2024-01-08')),
      makeSession(76, 76, new Date('2024-01-01')),
    ]);
    // Skill-level gap scores averaging 81 (above threshold)
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 80),
      makeGapScore('TypeScript', '', 82),
    ]);
    // Topic-level recommendation
    mockGapFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 78));

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('ready');
    expect(result.recommendedArea).toBe('hooks');
  });

  it('returns improving when sessions >= 3, trend > 0, avg < threshold', async () => {
    // Increasing trend: 60 → 65 → 70
    mockSessionFindMany.mockResolvedValue([
      makeSession(70, 70, new Date('2024-01-15')),
      makeSession(65, 65, new Date('2024-01-08')),
      makeSession(60, 60, new Date('2024-01-01')),
    ]);
    // Skill avg = 65, below threshold of 75
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 65),
    ]);
    mockGapFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 65));

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('improving');
  });

  it('returns not_ready when sessions >= 3, trend < 0', async () => {
    // Declining trend: 80 → 70 → 60
    mockSessionFindMany.mockResolvedValue([
      makeSession(60, 60, new Date('2024-01-15')),
      makeSession(70, 70, new Date('2024-01-08')),
      makeSession(80, 80, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 65),
    ]);
    mockGapFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    expect(result.status).toBe('not_ready');
  });

  it('returns not_ready when sessions >= 3, trend == 0 (flat), avg < threshold', async () => {
    // Flat trend: all 65
    mockSessionFindMany.mockResolvedValue([
      makeSession(65, 65, new Date('2024-01-15')),
      makeSession(65, 65, new Date('2024-01-08')),
      makeSession(65, 65, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 65),
    ]);
    mockGapFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    // flat (trend=0) + below threshold = not_ready (improving requires trend > 0)
    expect(result.status).toBe('not_ready');
  });

  it('uses the passed threshold parameter, not a hardcoded 75', async () => {
    // Positive trend: 81 → 83 → 85
    mockSessionFindMany.mockResolvedValue([
      makeSession(85, 85, new Date('2024-01-15')),
      makeSession(83, 83, new Date('2024-01-08')),
      makeSession(81, 81, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 83),
    ]);
    mockGapFindFirst.mockResolvedValue(null);

    // With threshold=90, avg of 83 should NOT be ready
    const result90 = await computeReadiness(1, 90);
    expect(result90.status).not.toBe('ready');

    // Reset mocks for second call
    vi.clearAllMocks();
    mockSessionFindMany.mockResolvedValue([
      makeSession(85, 85, new Date('2024-01-15')),
      makeSession(83, 83, new Date('2024-01-08')),
      makeSession(81, 81, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 83),
    ]);
    mockGapFindFirst.mockResolvedValue(null);

    // With threshold=80, avg of 83 should be ready (trend is positive)
    const result80 = await computeReadiness(1, 80);
    expect(result80.status).toBe('ready');
  });

  it('recommendedArea equals the topic with the lowest weightedScore from GapScore (topic != "")', async () => {
    // Positive trend
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 80, new Date('2024-01-15')),
      makeSession(78, 78, new Date('2024-01-08')),
      makeSession(76, 76, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 78),
    ]);
    // Lowest topic score is 'hooks' at 55
    mockGapFindFirst.mockResolvedValue(makeGapScore('React', 'hooks', 55));

    const result = await computeReadiness(1, 75);
    expect(result.recommendedArea).toBe('hooks');
  });

  it('recommendedArea falls back to lowest skill name when no topic-level scores exist', async () => {
    // Positive trend
    mockSessionFindMany.mockResolvedValue([
      makeSession(80, 80, new Date('2024-01-15')),
      makeSession(78, 78, new Date('2024-01-08')),
      makeSession(76, 76, new Date('2024-01-01')),
    ]);
    // Two skills: React at 60 (lowest), TypeScript at 75
    // findMany returns ASC by weightedScore, so React comes first
    mockGapFindMany.mockResolvedValue([
      makeGapScore('React', '', 60),
      makeGapScore('TypeScript', '', 75),
    ]);
    // No topic-level scores
    mockGapFindFirst.mockResolvedValue(null);

    const result = await computeReadiness(1, 75);
    // Falls back to lowest skill: React (first in ASC order)
    expect(result.recommendedArea).toBe('React');
  });
});

describe('recomputeAllReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls computeReadiness for every associate in the DB and updates each', async () => {
    const associates = [{ id: 1 }, { id: 2 }];
    mockAssocFindMany.mockResolvedValue(associates);

    // For each associate: session findMany, gap findMany, gap findFirst
    mockSessionFindMany.mockResolvedValue([
      makeSession(70, 70, new Date('2024-01-15')),
      makeSession(65, 65, new Date('2024-01-08')),
      makeSession(60, 60, new Date('2024-01-01')),
    ]);
    mockGapFindMany.mockResolvedValue([makeGapScore('React', '', 65)]);
    mockGapFindFirst.mockResolvedValue(null);
    mockAssocUpdate.mockResolvedValue({});

    await recomputeAllReadiness(75);

    // Should have updated one record per associate
    expect(mockAssocUpdate).toHaveBeenCalledTimes(2);
    // Each call should pass readinessStatus in data
    const calls = mockAssocUpdate.mock.calls as Array<[{ data: { readinessStatus: string } }]>;
    calls.forEach((callArgs) => {
      expect(callArgs[0].data).toHaveProperty('readinessStatus');
      expect(callArgs[0].data).toHaveProperty('recommendedArea');
      expect(callArgs[0].data).toHaveProperty('lastComputedAt');
    });
  });
});
