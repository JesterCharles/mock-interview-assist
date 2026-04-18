import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: { findMany: vi.fn() },
    gapScore: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

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
});
