/**
 * Unit tests for /api/settings route and settingsService.
 *
 * Prisma and auth are mocked — no DB connection or cookie required.
 *
 * Tests cover:
 * - Auth guard (401 for unauthenticated requests)
 * - GET /api/settings returns current threshold (default 75 when no row)
 * - PUT /api/settings validates threshold 0-100 (rejects invalid values with 400)
 * - PUT /api/settings triggers recomputeAllReadiness with the new threshold
 * - settingsService: getSettings defaults to 75 when no Settings row
 * - settingsService: updateThreshold upserts and calls recomputeAllReadiness
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    settings: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

// --- Mock @/lib/auth-server ---
vi.mock('@/lib/auth-server', () => ({
  isAuthenticatedSession: vi.fn(),
}));

// --- Mock @/lib/readinessService ---
vi.mock('@/lib/readinessService', () => ({
  recomputeAllReadiness: vi.fn(),
}));

// Imports AFTER vi.mock declarations
import { prisma } from '@/lib/prisma';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { recomputeAllReadiness } from '@/lib/readinessService';
import { getSettings, updateThreshold } from '@/lib/settingsService';
import { GET, PUT } from '@/app/api/settings/route';

// Typed mock references
const mockSettingsFindFirst = prisma.settings.findFirst as ReturnType<typeof vi.fn>;
const mockSettingsUpsert = prisma.settings.upsert as ReturnType<typeof vi.fn>;
const mockIsAuthenticated = isAuthenticatedSession as ReturnType<typeof vi.fn>;
const mockRecomputeAll = recomputeAllReadiness as ReturnType<typeof vi.fn>;

// Helper to create a minimal NextRequest-like object
function makeRequest(body?: unknown): Request {
  if (body === undefined) {
    return new Request('http://localhost/api/settings');
  }
  return new Request('http://localhost/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- settingsService tests ---

describe('settingsService.getSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { readinessThreshold: 75 } when no Settings row exists', async () => {
    mockSettingsFindFirst.mockResolvedValue(null);
    const result = await getSettings();
    expect(result).toEqual({ readinessThreshold: 75 });
  });

  it('returns stored readinessThreshold when Settings row exists', async () => {
    mockSettingsFindFirst.mockResolvedValue({ id: 1, readinessThreshold: 80, updatedAt: new Date() });
    const result = await getSettings();
    expect(result).toEqual({ readinessThreshold: 80 });
  });
});

describe('settingsService.updateThreshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsUpsert.mockResolvedValue({});
    mockRecomputeAll.mockResolvedValue(undefined);
  });

  it('upserts Settings row with new threshold', async () => {
    await updateThreshold(80);
    expect(mockSettingsUpsert).toHaveBeenCalledOnce();
    expect(mockSettingsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        create: expect.objectContaining({ readinessThreshold: 80 }),
        update: expect.objectContaining({ readinessThreshold: 80 }),
      }),
    );
  });

  it('calls recomputeAllReadiness with the new threshold after upsert', async () => {
    await updateThreshold(85);
    expect(mockRecomputeAll).toHaveBeenCalledOnce();
    expect(mockRecomputeAll).toHaveBeenCalledWith(85);
  });
});

// --- GET /api/settings route tests ---

describe('GET /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAuthenticated.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns current threshold when authenticated (default 75 when no row)', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockSettingsFindFirst.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ readinessThreshold: 75 });
  });

  it('returns stored threshold when Settings row exists', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockSettingsFindFirst.mockResolvedValue({ id: 1, readinessThreshold: 90, updatedAt: new Date() });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ readinessThreshold: 90 });
  });
});

// --- PUT /api/settings route tests ---

describe('PUT /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsUpsert.mockResolvedValue({});
    mockRecomputeAll.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAuthenticated.mockResolvedValue(false);
    const req = makeRequest({ readinessThreshold: 80 });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 and success:true when valid threshold is provided', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 80 });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it('returns 400 for negative threshold', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: -1 });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for threshold > 100', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 101 });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for string threshold', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 'invalid' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when readinessThreshold field is missing', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({});
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('triggers recomputeAllReadiness with the new threshold on valid PUT', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 85 });
    await PUT(req);
    expect(mockRecomputeAll).toHaveBeenCalledOnce();
    expect(mockRecomputeAll).toHaveBeenCalledWith(85);
  });

  it('accepts boundary value 0', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 0 });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });

  it('accepts boundary value 100', async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const req = makeRequest({ readinessThreshold: 100 });
    const res = await PUT(req);
    expect(res.status).toBe(200);
  });
});
