import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — factory must construct everything inline.
// prisma.$transaction(cb) invokes the callback with a `tx` that forwards to
// the same gapScore mock functions so existing call-site assertions still work.
vi.mock('@/lib/prisma', () => {
  const gapScore = {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  };
  return {
    prisma: {
      session: { findMany: vi.fn() },
      gapScore,
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({ gapScore });
      }),
    },
  };
});

vi.mock('@/lib/gapService', () => ({
  computeGapScores: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { computeGapScores } from '@/lib/gapService';
import { saveGapScores } from '@/lib/gapPersistence';

describe('saveGapScores prevWeightedScore lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default session list so code reaches the upsert branch
    (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 's1',
        candidateName: '',
        interviewerName: '',
        date: new Date(),
        status: 'completed',
        questionCount: 0,
        selectedWeeks: [],
        overallTechnicalScore: 80,
        overallSoftSkillScore: null,
        technicalFeedback: null,
        softSkillFeedback: null,
        questions: [],
        starterQuestions: [],
        assessments: {},
        techMap: {},
      },
    ]);
    (prisma.gapScore.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    // Default $transaction pass-through is set in the module-factory mock.
  });

  it('leaves prevWeightedScore null on first upsert for a new (skill, topic)', async () => {
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]); // no existing rows
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 1 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    const call = (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.prevWeightedScore).toBeNull();
    expect(call.update.prevWeightedScore).toBeNull();
    expect(call.update.weightedScore).toBe(0.72);
  });

  it('captures prior weightedScore into prevWeightedScore on subsequent upsert', async () => {
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'g1', skill: 'React', topic: '', weightedScore: 0.6 },
    ]);
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 2 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    const call = (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.update.prevWeightedScore).toBe(0.6);
    expect(call.update.weightedScore).toBe(0.72);
  });

  it('updates prevWeightedScore to the value that was current before this save', async () => {
    // Simulates two runs in sequence — each save should see the prior run's weightedScore as prev
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'g1', skill: 'React', topic: '', weightedScore: 0.72 }, // from prior session
    ]);
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.81, sessionCount: 3 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    const call = (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.update.prevWeightedScore).toBe(0.72);
    expect(call.update.weightedScore).toBe(0.81);
  });

  it('tracks prior values per (skill, topic) independently when multiple skills upsert', async () => {
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'g1', skill: 'React', topic: '', weightedScore: 0.6 },
      { id: 'g2', skill: 'SQL', topic: '', weightedScore: 0.4 },
      { id: 'g3', skill: 'React', topic: 'hooks', weightedScore: 0.55 },
    ]);
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 2 },
      { skill: 'SQL', topic: '', weightedScore: 0.45, sessionCount: 2 },
      { skill: 'React', topic: 'hooks', weightedScore: 0.66, sessionCount: 2 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    const calls = (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    const byKey = Object.fromEntries(
      calls.map((c) => [`${c.update.weightedScore}`, c.update.prevWeightedScore]),
    );
    // React skill-level: prior 0.60 → now 0.72
    expect(byKey['0.72']).toBe(0.6);
    // SQL skill-level: prior 0.40 → now 0.45
    expect(byKey['0.45']).toBe(0.4);
    // React/hooks topic-level: prior 0.55 → now 0.66
    expect(byKey['0.66']).toBe(0.55);
  });

  it('still deletes stale (skill, topic) rows that fall out of the computed set', async () => {
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'g1', skill: 'React', topic: '', weightedScore: 0.6 },
      { id: 'g2', skill: 'Node', topic: '', weightedScore: 0.55 }, // gone this run
    ]);
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 2 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    expect(prisma.gapScore.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['g2'] } },
    });
  });

  it('wraps read+write path in prisma.$transaction (P2 fix: TOCTOU prevention)', async () => {
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (computeGapScores as ReturnType<typeof vi.fn>).mockReturnValue([
      { skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 1 },
    ]);
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await saveGapScores(1);

    // The transaction must be used (defends against concurrent prior-snapshot race).
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('concurrent saves observe each other: second save sees first save as its prior', async () => {
    // P2 fix concurrency test.
    //
    // Two saveGapScores calls fire for the same associate. To model the actual
    // serialization that Prisma/DB locks provide, we have the transaction
    // mock serialize callbacks (only one runs at a time) AND mutate the
    // findMany/upsert responses so the second save reads the first save's
    // new value as its prior.
    const state = new Map<string, number>();
    (prisma.gapScore.findMany as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      return Array.from(state.entries()).map(([key, weightedScore], i) => {
        const [skill, topic] = key.split('::');
        return { id: `g${i}`, skill, topic, weightedScore };
      });
    });
    (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mockImplementation(
      async (args: {
        where: { associateId_skill_topic: { skill: string; topic: string } };
        create: { weightedScore: number };
        update: { weightedScore: number };
      }) => {
        const { skill, topic } = args.where.associateId_skill_topic;
        state.set(`${skill}::${topic}`, args.update.weightedScore);
        return {};
      },
    );

    // Serialize $transaction callbacks — mimic DB-level upsert conflict serialization.
    let txQueue: Promise<unknown> = Promise.resolve();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => {
        const run = txQueue.then(() => cb({ gapScore: prisma.gapScore }));
        txQueue = run.catch(() => undefined);
        return run;
      },
    );

    (computeGapScores as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{ skill: 'React', topic: '', weightedScore: 0.6, sessionCount: 1 }])
      .mockReturnValueOnce([{ skill: 'React', topic: '', weightedScore: 0.72, sessionCount: 2 }]);

    // Fire both saves in parallel.
    await Promise.all([saveGapScores(1), saveGapScores(1)]);

    const calls = (prisma.gapScore.upsert as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    // First save: no prior.
    expect(calls[0].update.prevWeightedScore).toBeNull();
    expect(calls[0].update.weightedScore).toBe(0.6);
    // Second save: must see the first save's weightedScore (0.6) as its prior, NOT null.
    expect(calls[1].update.prevWeightedScore).toBe(0.6);
    expect(calls[1].update.weightedScore).toBe(0.72);
    // Prior must not equal the final weightedScore (that would be the bug).
    expect(calls[1].update.prevWeightedScore).not.toBe(calls[1].update.weightedScore);
  });
});
