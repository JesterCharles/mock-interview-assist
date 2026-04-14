import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock deps BEFORE importing subject
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/lib/gapPersistence', () => ({
  saveGapScores: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/readinessService', () => ({
  updateAssociateReadiness: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/settingsService', () => ({
  getSettings: vi.fn().mockResolvedValue({ readinessThreshold: 80 }),
}));

import { runReadinessPipeline } from '@/lib/readinessPipeline';
import { prisma } from '@/lib/prisma';
import { saveGapScores } from '@/lib/gapPersistence';
import { updateAssociateReadiness } from '@/lib/readinessService';
import { getSettings } from '@/lib/settingsService';

const mockSessionUpdate = prisma.session.update as unknown as ReturnType<typeof vi.fn>;
const mockSaveGapScores = saveGapScores as unknown as ReturnType<typeof vi.fn>;
const mockUpdateReadiness = updateAssociateReadiness as unknown as ReturnType<typeof vi.fn>;
const mockGetSettings = getSettings as unknown as ReturnType<typeof vi.fn>;

describe('runReadinessPipeline', () => {
  beforeEach(() => {
    mockSessionUpdate.mockReset().mockResolvedValue({});
    mockSaveGapScores.mockReset().mockResolvedValue(undefined);
    mockUpdateReadiness.mockReset().mockResolvedValue(undefined);
    mockGetSettings.mockReset().mockResolvedValue({ readinessThreshold: 80 });
  });

  it('Test 1: calls saveGapScores then updateAssociateReadiness in order', async () => {
    const order: string[] = [];
    mockSaveGapScores.mockImplementationOnce(async () => {
      order.push('gap');
    });
    mockUpdateReadiness.mockImplementationOnce(async () => {
      order.push('readiness');
    });

    await runReadinessPipeline(42);

    expect(order).toEqual(['gap', 'readiness']);
    expect(mockSaveGapScores).toHaveBeenCalledWith(42);
  });

  it('Test 2: uses threshold from getSettings when available', async () => {
    mockGetSettings.mockResolvedValueOnce({ readinessThreshold: 90 });

    await runReadinessPipeline(7);

    expect(mockUpdateReadiness).toHaveBeenCalledWith(7, 90);
  });

  it('Test 3: falls back to threshold 75 when getSettings throws', async () => {
    mockGetSettings.mockRejectedValueOnce(new Error('db down'));

    await runReadinessPipeline(9);

    expect(mockUpdateReadiness).toHaveBeenCalledWith(9, 75);
  });

  it('Test 4: with sessionId, marks pending then done', async () => {
    await runReadinessPipeline(1, 100);

    const calls = mockSessionUpdate.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toEqual({ where: { id: 100 }, data: { readinessRecomputeStatus: 'pending' } });
    expect(calls[1][0]).toEqual({ where: { id: 100 }, data: { readinessRecomputeStatus: 'done' } });
  });

  it('Test 5: when saveGapScores throws, marks failed and does not re-throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSaveGapScores.mockRejectedValueOnce(new Error('gap boom'));

    await expect(runReadinessPipeline(1, 200)).resolves.toBeUndefined();

    const calls = mockSessionUpdate.mock.calls;
    expect(calls[0][0]).toEqual({ where: { id: 200 }, data: { readinessRecomputeStatus: 'pending' } });
    expect(calls[calls.length - 1][0]).toEqual({ where: { id: 200 }, data: { readinessRecomputeStatus: 'failed' } });
    expect(mockUpdateReadiness).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('Test 6: when updateAssociateReadiness throws, marks failed and does not re-throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateReadiness.mockRejectedValueOnce(new Error('readiness boom'));

    await expect(runReadinessPipeline(1, 300)).resolves.toBeUndefined();

    const calls = mockSessionUpdate.mock.calls;
    expect(calls[calls.length - 1][0]).toEqual({ where: { id: 300 }, data: { readinessRecomputeStatus: 'failed' } });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('Test 7: no sessionId => never touches readinessRecomputeStatus column', async () => {
    await runReadinessPipeline(55);

    expect(mockSessionUpdate).not.toHaveBeenCalled();
    expect(mockSaveGapScores).toHaveBeenCalledWith(55);
    expect(mockUpdateReadiness).toHaveBeenCalledWith(55, 80);
  });

  it('marker update failures do not crash the helper', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSessionUpdate.mockRejectedValue(new Error('marker db hiccup'));

    await expect(runReadinessPipeline(1, 400)).resolves.toBeUndefined();

    expect(mockSaveGapScores).toHaveBeenCalled();
    expect(mockUpdateReadiness).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
