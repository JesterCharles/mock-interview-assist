/**
 * Tests for persistCodingSignalToGapScore + DIFFICULTY_MULTIPLIERS.
 *
 * Phase 41 Plan 01 — Task 2.
 *
 * Covers:
 *  - Exact multiplier constants (D-02)
 *  - weightedScore arithmetic (mappedScore × difficultyMultiplier × signal.weight)
 *  - Topic format "coding:<language>" (D-03)
 *  - Skill routing from signal.skillSlug
 *  - prevWeightedScore preservation + first-insert null behavior
 *  - sessionCount increment semantics
 *  - Unknown difficulty rejection
 *  - Farming resistance (per-attempt invariant — decay is gapService's concern)
 *
 * Prisma is mocked in-process via vi.mock — no DB connection required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// In-memory row store so we can assert full create/update payloads.
type GapScoreRow = {
  associateId: number;
  skill: string;
  topic: string;
  weightedScore: number;
  prevWeightedScore: number | null;
  sessionCount: number;
};

const store = new Map<string, GapScoreRow>();
const keyOf = (associateId: number, skill: string, topic: string) =>
  `${associateId}::${skill}::${topic}`;

function resetStore() {
  store.clear();
}

// Capture the last upsert payload for shape assertions
let lastUpsertPayload: {
  where: { associateId_skill_topic: { associateId: number; skill: string; topic: string } };
  update: Partial<GapScoreRow>;
  create: GapScoreRow;
} | null = null;

vi.mock('@/lib/prisma', () => {
  const mockClient = {
    gapScore: {
      findUnique: vi.fn(
        async ({ where }: {
          where: {
            associateId_skill_topic: {
              associateId: number;
              skill: string;
              topic: string;
            };
          };
        }) => {
          const { associateId, skill, topic } = where.associateId_skill_topic;
          const k = keyOf(associateId, skill, topic);
          const row = store.get(k);
          if (!row) return null;
          return { weightedScore: row.weightedScore, sessionCount: row.sessionCount };
        },
      ),
      upsert: vi.fn(
        async (payload: {
          where: {
            associateId_skill_topic: {
              associateId: number;
              skill: string;
              topic: string;
            };
          };
          update: Partial<GapScoreRow>;
          create: GapScoreRow;
        }) => {
          lastUpsertPayload = payload;
          const { associateId, skill, topic } = payload.where.associateId_skill_topic;
          const k = keyOf(associateId, skill, topic);
          const existing = store.get(k);
          if (existing) {
            const merged: GapScoreRow = { ...existing, ...payload.update } as GapScoreRow;
            store.set(k, merged);
            return merged;
          }
          store.set(k, payload.create);
          return payload.create;
        },
      ),
    },
    // Pass-through transaction — run the callback with the mocked client itself.
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockClient)),
  };
  return { prisma: mockClient };
});

import { DIFFICULTY_MULTIPLIERS, persistCodingSignalToGapScore } from '@/lib/gapPersistence';

beforeEach(() => {
  resetStore();
  lastUpsertPayload = null;
  vi.clearAllMocks();
});

describe('DIFFICULTY_MULTIPLIERS', () => {
  it('locks exact values per Phase 41 D-02 (easy=0.7, medium=1.0, hard=1.3)', () => {
    expect(DIFFICULTY_MULTIPLIERS.easy).toBe(0.7);
    expect(DIFFICULTY_MULTIPLIERS.medium).toBe(1.0);
    expect(DIFFICULTY_MULTIPLIERS.hard).toBe(1.3);
  });
});

describe('persistCodingSignalToGapScore', () => {
  const baseSignal = {
    attemptId: 'att-1',
    skillSlug: 'python-fundamentals',
    signalType: 'pass' as const,
    weight: 1.0,
    mappedScore: 100,
  };

  it('writes weightedScore = mappedScore × difficulty multiplier × signal.weight (hard pass)', async () => {
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'hard', language: 'python' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:python'));
    expect(row).toBeDefined();
    // 100 * 1.3 * 1.0 = 130
    expect(row!.weightedScore).toBeCloseTo(130, 5);
  });

  it('applies easy multiplier (70 for mappedScore=100, weight=1.0)', async () => {
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'easy', language: 'python' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:python'));
    expect(row!.weightedScore).toBeCloseTo(70, 5);
  });

  it('applies medium multiplier (score unchanged vs signal)', async () => {
    await persistCodingSignalToGapScore(
      { ...baseSignal, mappedScore: 80, weight: 0.9 },
      { difficulty: 'medium', language: 'javascript' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:javascript'));
    // 80 * 1.0 * 0.9 = 72
    expect(row!.weightedScore).toBeCloseTo(72, 5);
  });

  it('keys topic as "coding:<language>" (D-03)', async () => {
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'medium', language: 'typescript' },
      7,
    );
    expect(lastUpsertPayload?.where.associateId_skill_topic.topic).toBe('coding:typescript');
  });

  it('uses signal.skillSlug as GapScore.skill (unchanged)', async () => {
    await persistCodingSignalToGapScore(
      { ...baseSignal, skillSlug: 'sql-joins' },
      { difficulty: 'medium', language: 'sql' },
      7,
    );
    expect(lastUpsertPayload?.where.associateId_skill_topic.skill).toBe('sql-joins');
  });

  it('preserves prevWeightedScore from the prior row on subsequent call', async () => {
    await persistCodingSignalToGapScore(
      { ...baseSignal, mappedScore: 100, weight: 1.0 },
      { difficulty: 'hard', language: 'python' },
      42,
    );
    // Row now has weightedScore=130, prev=null.
    await persistCodingSignalToGapScore(
      { ...baseSignal, mappedScore: 50, weight: 1.0 },
      { difficulty: 'medium', language: 'python' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:python'));
    expect(row!.prevWeightedScore).toBeCloseTo(130, 5);
    expect(row!.weightedScore).toBeCloseTo(50, 5); // 50 * 1.0 * 1.0
  });

  it('sets prevWeightedScore=null + sessionCount=1 on first insert', async () => {
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'medium', language: 'python' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:python'));
    expect(row!.prevWeightedScore).toBeNull();
    expect(row!.sessionCount).toBe(1);
  });

  it('increments sessionCount on subsequent call for same (associate, skill, topic)', async () => {
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'medium', language: 'python' },
      42,
    );
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'medium', language: 'python' },
      42,
    );
    const row = store.get(keyOf(42, 'python-fundamentals', 'coding:python'));
    expect(row!.sessionCount).toBe(2);
  });

  it('throws when difficulty is unknown', async () => {
    await expect(
      persistCodingSignalToGapScore(
        baseSignal,
        // @ts-expect-error — testing defensive throw on bad input
        { difficulty: 'extreme', language: 'python' },
        42,
      ),
    ).rejects.toThrow(/Unknown difficulty/);
  });

  it('prevents easy-attempt farming: per-attempt weighted score scales with difficulty', async () => {
    // Two associates (distinct keys) to isolate the per-attempt weighted writes.
    //
    // Per-attempt math (pre-decay — decay is gapService's concern):
    //   easy pass (weight 1.0)  → 100 * 0.7 * 1.0 = 70
    //   hard pass (weight 1.0)  → 100 * 1.3 * 1.0 = 130
    //
    // 1 hard pass contributes ~1.86× the per-attempt weighted score of 1 easy pass.
    // Decay aggregation never re-weights by difficulty, so no amount of easy
    // attempts can catch the hard-attempt signal unless their unweighted
    // frequency overwhelms the 0.8 decay — which is bounded by recency anyway.
    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'easy', language: 'python' },
      1,
    );
    const easyRow = store.get(keyOf(1, 'python-fundamentals', 'coding:python'));

    await persistCodingSignalToGapScore(
      baseSignal,
      { difficulty: 'hard', language: 'python' },
      2,
    );
    const hardRow = store.get(keyOf(2, 'python-fundamentals', 'coding:python'));

    expect(easyRow!.weightedScore).toBeCloseTo(70, 5);
    expect(hardRow!.weightedScore).toBeCloseTo(130, 5);
    expect(hardRow!.weightedScore).toBeGreaterThan(easyRow!.weightedScore);
    expect(hardRow!.weightedScore / easyRow!.weightedScore).toBeCloseTo(130 / 70, 5);
  });
});
