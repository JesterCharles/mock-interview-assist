import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock deps BEFORE importing subject
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('@/lib/readinessPipeline', () => ({
  runReadinessPipeline: vi.fn().mockResolvedValue(undefined),
}));

import { runReadinessSweep } from '@/lib/readinessSweep';
import { prisma } from '@/lib/prisma';
import { runReadinessPipeline } from '@/lib/readinessPipeline';

const mockFindMany = prisma.session.findMany as unknown as ReturnType<typeof vi.fn>;
const mockUpdateMany = prisma.session.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockPipeline = runReadinessPipeline as unknown as ReturnType<typeof vi.fn>;

describe('runReadinessSweep', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockPipeline.mockReset().mockResolvedValue(undefined);
  });

  it('Test 1: returns zeros when no pending/failed sessions exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const result = await runReadinessSweep();

    expect(result).toEqual({
      associatesProcessed: 0,
      sessionsExaminedCount: 0,
      successCount: 0,
      failureCount: 0,
    });
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it('Test 2: single associate with 3 pending sessions → pipeline called ONCE (deduped)', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 's1', associateId: 10 },
      { id: 's2', associateId: 10 },
      { id: 's3', associateId: 10 },
    ]);

    const result = await runReadinessSweep();

    expect(mockPipeline).toHaveBeenCalledTimes(1);
    // Most recent session id is the marker — list ordered asc by createdAt,
    // so last element is most recent.
    expect(mockPipeline).toHaveBeenCalledWith(10, 's3');
    expect(result.associatesProcessed).toBe(1);
    expect(result.sessionsExaminedCount).toBe(3);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });

  it('Test 3: two associates with pending sessions → pipeline called twice', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 's1', associateId: 10 },
      { id: 's2', associateId: 20 },
      { id: 's3', associateId: 10 },
    ]);

    const result = await runReadinessSweep();

    expect(mockPipeline).toHaveBeenCalledTimes(2);
    expect(mockPipeline).toHaveBeenCalledWith(10, 's3');
    expect(mockPipeline).toHaveBeenCalledWith(20, 's2');
    expect(result.associatesProcessed).toBe(2);
    expect(result.successCount).toBe(2);
  });

  it('Test 4: batchSize=2 with 5 affected associates → only first 2 processed', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 's1', associateId: 10 },
      { id: 's2', associateId: 20 },
      { id: 's3', associateId: 30 },
      { id: 's4', associateId: 40 },
      { id: 's5', associateId: 50 },
    ]);

    const result = await runReadinessSweep({ batchSize: 2 });

    expect(mockPipeline).toHaveBeenCalledTimes(2);
    expect(mockPipeline).toHaveBeenCalledWith(10, 's1');
    expect(mockPipeline).toHaveBeenCalledWith(20, 's2');
    expect(result.associatesProcessed).toBe(2);
  });

  it('Test 5: pipeline throws for one associate → other associates still processed', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 's1', associateId: 10 },
      { id: 's2', associateId: 20 },
    ]);
    mockPipeline.mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    mockPipeline.mockResolvedValueOnce(undefined);

    const result = await runReadinessSweep();

    expect(mockPipeline).toHaveBeenCalledTimes(2);
    expect(result.associatesProcessed).toBe(2);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it('Test 6: after successful run, other pending/failed sessions for the associate are marked done via updateMany', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 's1', associateId: 10 },
      { id: 's2', associateId: 10 },
    ]);

    await runReadinessSweep();

    // Marker session (s2) is handled by pipeline itself; updateMany sweeps up the rest.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          associateId: 10,
          readinessRecomputeStatus: { in: ['pending', 'failed'] },
          id: { not: 's2' },
        }),
        data: { readinessRecomputeStatus: 'done' },
      }),
    );
  });

  it('Test 7: idempotent — second run with no new failures yields 0 examined', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const result = await runReadinessSweep();

    expect(result.sessionsExaminedCount).toBe(0);
    expect(result.associatesProcessed).toBe(0);
  });
});
