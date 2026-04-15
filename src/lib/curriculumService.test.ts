/**
 * curriculumService.test.ts
 *
 * Vitest unit tests for the curriculum service.
 * Prisma is mocked so no DB connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock prisma before importing the module under test
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma', () => ({
  prisma: {
    curriculumWeek: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  listWeeks,
  getTaughtWeeks,
  createWeek,
  updateWeek,
  deleteWeek,
} from '@/lib/curriculumService';

const mockWeekRow = {
  id: 1,
  cohortId: 10,
  weekNumber: 1,
  skillName: 'React',
  skillSlug: 'react',
  topicTags: ['hooks', 'jsx'],
  startDate: new Date('2026-01-01T00:00:00Z'),
};

// ---------------------------------------------------------------------------
// Helper to reset mocks
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listWeeks
// ---------------------------------------------------------------------------
describe('listWeeks', () => {
  it('calls findMany with cohortId and weekNumber asc ordering', async () => {
    (prisma.curriculumWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockWeekRow]);

    const result = await listWeeks(10);

    expect(prisma.curriculumWeek.findMany).toHaveBeenCalledWith({
      where: { cohortId: 10 },
      orderBy: { weekNumber: 'asc' },
    });
    expect(result).toEqual([mockWeekRow]);
  });
});

// ---------------------------------------------------------------------------
// getTaughtWeeks — boundary and filter tests
// ---------------------------------------------------------------------------
describe('getTaughtWeeks', () => {
  it('filters out future-dated weeks', async () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const pastWeek = { ...mockWeekRow, startDate: new Date('2026-05-01T00:00:00Z') };
    const futureWeek = { ...mockWeekRow, id: 2, weekNumber: 2, startDate: new Date('2026-07-01T00:00:00Z') };

    (prisma.curriculumWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pastWeek]);

    const result = await getTaughtWeeks(10, now);

    // Should pass startDate lte now to prisma
    expect(prisma.curriculumWeek.findMany).toHaveBeenCalledWith({
      where: { cohortId: 10, startDate: { lte: now } },
      orderBy: { weekNumber: 'asc' },
    });
    expect(result).toEqual([pastWeek]);
    expect(result).not.toContainEqual(futureWeek);
  });

  it('includes weeks with startDate exactly equal to now (boundary)', async () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const boundaryWeek = { ...mockWeekRow, startDate: now };

    (prisma.curriculumWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([boundaryWeek]);

    const result = await getTaughtWeeks(10, now);

    expect(prisma.curriculumWeek.findMany).toHaveBeenCalledWith({
      where: { cohortId: 10, startDate: { lte: now } },
      orderBy: { weekNumber: 'asc' },
    });
    expect(result).toEqual([boundaryWeek]);
  });

  it('uses current Date when now parameter is omitted', async () => {
    (prisma.curriculumWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const before = new Date();
    await getTaughtWeeks(10);
    const after = new Date();

    const [[callArg]] = (prisma.curriculumWeek.findMany as ReturnType<typeof vi.fn>).mock.calls;
    const passedDate: Date = callArg.where.startDate.lte;
    expect(passedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(passedDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ---------------------------------------------------------------------------
// createWeek — validation and Prisma delegation
// ---------------------------------------------------------------------------
describe('createWeek', () => {
  it('throws validation error when skillSlug is missing', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 1,
        skillName: 'React',
        skillSlug: '',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/skillSlug/i);
  });

  it('throws validation error for non-kebab skillSlug (space in slug)', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 1,
        skillName: 'React JS',
        skillSlug: 'React JS',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/skillSlug/i);
  });

  it('throws validation error for uppercase characters in skillSlug', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 1,
        skillName: 'React',
        skillSlug: 'React',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/skillSlug/i);
  });

  it('throws validation error for slug with leading hyphen', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 1,
        skillName: 'React',
        skillSlug: '-react',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/skillSlug/i);
  });

  it('throws validation error when skillName is missing', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 1,
        skillName: '',
        skillSlug: 'react',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/skillName/i);
  });

  it('throws validation error when weekNumber < 1', async () => {
    await expect(
      createWeek(10, {
        weekNumber: 0,
        skillName: 'React',
        skillSlug: 'react',
        topicTags: [],
        startDate: new Date(),
      })
    ).rejects.toThrow(/weekNumber/i);
  });

  it('creates week when valid input provided', async () => {
    (prisma.curriculumWeek.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockWeekRow);

    const result = await createWeek(10, {
      weekNumber: 1,
      skillName: 'React',
      skillSlug: 'react',
      topicTags: ['hooks'],
      startDate: new Date('2026-01-01T00:00:00Z'),
    });

    expect(prisma.curriculumWeek.create).toHaveBeenCalledWith({
      data: {
        cohortId: 10,
        weekNumber: 1,
        skillName: 'React',
        skillSlug: 'react',
        topicTags: ['hooks'],
        startDate: expect.any(Date),
      },
    });
    expect(result).toEqual(mockWeekRow);
  });

  it('accepts valid multi-segment kebab-case slug (e.g. node-js)', async () => {
    (prisma.curriculumWeek.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockWeekRow,
      skillSlug: 'node-js',
    });

    await expect(
      createWeek(10, {
        weekNumber: 2,
        skillName: 'Node.js',
        skillSlug: 'node-js',
        topicTags: [],
        startDate: new Date(),
      })
    ).resolves.toBeDefined();
  });

  it('propagates Prisma P2002 unique-violation error untouched (route maps to 409)', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    (prisma.curriculumWeek.create as ReturnType<typeof vi.fn>).mockRejectedValue(p2002);

    const err = await createWeek(10, {
      weekNumber: 1,
      skillName: 'React',
      skillSlug: 'react',
      topicTags: [],
      startDate: new Date(),
    }).catch((e) => e);

    expect(err).toBe(p2002);
    expect((err as { code?: string }).code).toBe('P2002');
  });
});

// ---------------------------------------------------------------------------
// updateWeek
// ---------------------------------------------------------------------------
describe('updateWeek', () => {
  it('calls prisma.curriculumWeek.update with provided fields', async () => {
    (prisma.curriculumWeek.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockWeekRow);

    const result = await updateWeek(1, { skillName: 'Updated React' });

    expect(prisma.curriculumWeek.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { skillName: 'Updated React' },
    });
    expect(result).toEqual(mockWeekRow);
  });

  it('validates skillSlug if provided', async () => {
    await expect(
      updateWeek(1, { skillSlug: 'Bad Slug' })
    ).rejects.toThrow(/skillSlug/i);
  });

  it('accepts valid skillSlug update', async () => {
    (prisma.curriculumWeek.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockWeekRow);

    await expect(
      updateWeek(1, { skillSlug: 'vue' })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// deleteWeek
// ---------------------------------------------------------------------------
describe('deleteWeek', () => {
  it('calls prisma.curriculumWeek.delete with correct id', async () => {
    (prisma.curriculumWeek.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockWeekRow);

    await deleteWeek(1);

    expect(prisma.curriculumWeek.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
