import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/readinessSweep', () => ({
  runReadinessSweep: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  isAuthenticatedSession: vi.fn(),
}));

import { POST } from './route';
import { runReadinessSweep } from '@/lib/readinessSweep';
import { isAuthenticatedSession } from '@/lib/auth-server';

const mockSweep = runReadinessSweep as unknown as ReturnType<typeof vi.fn>;
const mockAuth = isAuthenticatedSession as unknown as ReturnType<typeof vi.fn>;

function makeRequest(url = 'http://localhost/api/admin/readiness-sweep'): Request {
  return new Request(url, { method: 'POST' });
}

describe('POST /api/admin/readiness-sweep', () => {
  beforeEach(() => {
    mockSweep.mockReset().mockResolvedValue({
      associatesProcessed: 0,
      sessionsExaminedCount: 0,
      successCount: 0,
      failureCount: 0,
    });
    mockAuth.mockReset().mockResolvedValue(true);
  });

  it('Test 1: no trainer cookie → 401', async () => {
    mockAuth.mockResolvedValueOnce(false);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it('Test 2: valid trainer cookie → 200 with SweepResult JSON', async () => {
    mockSweep.mockResolvedValueOnce({
      associatesProcessed: 3,
      sessionsExaminedCount: 7,
      successCount: 3,
      failureCount: 0,
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      associatesProcessed: 3,
      sessionsExaminedCount: 7,
      successCount: 3,
      failureCount: 0,
    });
  });

  it('Test 3: query param ?batchSize=10 is parsed and forwarded', async () => {
    const res = await POST(makeRequest('http://localhost/api/admin/readiness-sweep?batchSize=10'));

    expect(res.status).toBe(200);
    expect(mockSweep).toHaveBeenCalledWith({ batchSize: 10 });
  });

  it('Test 4: invalid batchSize → 400', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/admin/readiness-sweep?batchSize=99999'),
    );

    expect(res.status).toBe(400);
    expect(mockSweep).not.toHaveBeenCalled();
  });

  it('Test 5: runReadinessSweep throws → 500 with generic error message', async () => {
    mockSweep.mockRejectedValueOnce(new Error('internal DB detail leaked here'));

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('internal DB detail');
  });
});
