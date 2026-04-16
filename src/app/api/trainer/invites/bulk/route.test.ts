import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

vi.mock('@/lib/inviteHelper', () => ({
  inviteAssociate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    authEvent: {
      count: vi.fn(),
    },
    cohort: {
      findUnique: vi.fn(),
    },
  },
}));

import { POST } from '@/app/api/trainer/invites/bulk/route';
import { getCallerIdentity } from '@/lib/identity';
import { inviteAssociate } from '@/lib/inviteHelper';
import { prisma } from '@/lib/prisma';

const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>;
const mockInviteAssociate = inviteAssociate as ReturnType<typeof vi.fn>;
const mockAuthEventCount = prisma.authEvent.count as ReturnType<typeof vi.fn>;
const mockCohortFindUnique = prisma.cohort.findUnique as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/trainer/invites/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const trainerCaller = { kind: 'trainer' as const, userId: 'u1', email: 'trainer@example.com' };
const validCohort = { id: 1, name: 'Cohort A' };

beforeEach(() => {
  vi.clearAllMocks();
  // Default: trainer caller, existing cohort, no daily invites yet, successful individual invites
  mockGetCallerIdentity.mockResolvedValue(trainerCaller);
  mockCohortFindUnique.mockResolvedValue(validCohort);
  mockAuthEventCount.mockResolvedValue(0);
  mockInviteAssociate.mockResolvedValue({ status: 'invited' });
});

describe('POST /api/trainer/invites/bulk', () => {
  describe('auth', () => {
    it('returns 401 for anonymous caller', async () => {
      mockGetCallerIdentity.mockResolvedValue({ kind: 'anonymous' });
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(401);
    });

    it('returns 401 for associate caller', async () => {
      mockGetCallerIdentity.mockResolvedValue({
        kind: 'associate', userId: 'u2', email: 'a@b.com', associateId: 1, associateSlug: 'abc',
      });
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(401);
    });

    it('allows admin caller', async () => {
      mockGetCallerIdentity.mockResolvedValue({ kind: 'admin', userId: 'u3', email: 'admin@example.com' });
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(200);
    });
  });

  describe('validation', () => {
    it('returns 400 when emails field is missing', async () => {
      const res = await POST(makeRequest({ cohortId: 1 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when emails array is empty', async () => {
      const res = await POST(makeRequest({ emails: [], cohortId: 1 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when emails array exceeds 50', async () => {
      const emails = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);
      const res = await POST(makeRequest({ emails, cohortId: 1 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when cohortId is missing', async () => {
      const res = await POST(makeRequest({ emails: ['a@b.com'] }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when cohortId is a string', async () => {
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 'one' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when an email in the array is invalid', async () => {
      const res = await POST(makeRequest({ emails: ['not-an-email'], cohortId: 1 }));
      expect(res.status).toBe(400);
    });
  });

  describe('cohort check', () => {
    it('returns 404 when cohort does not exist', async () => {
      mockCohortFindUnique.mockResolvedValue(null);
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 999 }));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/cohort not found/i);
    });
  });

  describe('daily rate limit pre-flight', () => {
    it('returns 429 when daily count + batch size exceeds 20', async () => {
      mockAuthEventCount.mockResolvedValue(18); // 18 sent today
      const emails = ['a@b.com', 'b@b.com', 'c@b.com']; // 3 more = 21 total
      const res = await POST(makeRequest({ emails, cohortId: 1 }));
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain('2 remaining of 20');
    });

    it('allows batch when daily count + batch size equals 20 exactly', async () => {
      mockAuthEventCount.mockResolvedValue(18); // 18 sent today
      const emails = ['a@b.com', 'b@b.com']; // 2 more = 20 total (exactly at limit)
      const res = await POST(makeRequest({ emails, cohortId: 1 }));
      expect(res.status).toBe(200);
    });

    it('returns 429 when already at limit (20 sent today)', async () => {
      mockAuthEventCount.mockResolvedValue(20);
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(429);
    });
  });

  describe('sequential processing', () => {
    it('returns 200 with results array for 2 invited emails', async () => {
      mockInviteAssociate.mockResolvedValue({ status: 'invited' });
      const res = await POST(makeRequest({ emails: ['a@b.com', 'b@b.com'], cohortId: 1 }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(2);
      expect(body.results[0]).toEqual({ email: 'a@b.com', status: 'invited' });
      expect(body.results[1]).toEqual({ email: 'b@b.com', status: 'invited' });
    });

    it('isolates partial failures — middle failure does not affect siblings', async () => {
      mockInviteAssociate
        .mockResolvedValueOnce({ status: 'invited' })
        .mockResolvedValueOnce({ status: 'failed', error: 'generateLink error' })
        .mockResolvedValueOnce({ status: 'invited' });

      const res = await POST(makeRequest({
        emails: ['a@b.com', 'fail@b.com', 'c@b.com'],
        cohortId: 1,
      }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(3);
      expect(body.results[0].status).toBe('invited');
      expect(body.results[1].status).toBe('failed');
      expect(body.results[1].error).toBe('generateLink error');
      expect(body.results[2].status).toBe('invited');
    });

    it('propagates skipped status in results', async () => {
      mockInviteAssociate.mockResolvedValue({ status: 'skipped', error: 'Already in target cohort' });
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results[0].status).toBe('skipped');
      expect(body.results[0].error).toBe('Already in target cohort');
    });

    it('catches unexpected errors from inviteAssociate and marks as failed', async () => {
      mockInviteAssociate.mockRejectedValueOnce(new Error('Unexpected DB error'));
      const res = await POST(makeRequest({ emails: ['a@b.com'], cohortId: 1 }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results[0].status).toBe('failed');
    });

    it('response body shape is { results: [{ email, status, error? }] }', async () => {
      mockInviteAssociate.mockResolvedValue({ status: 'reassigned' });
      const res = await POST(makeRequest({ emails: ['x@y.com'], cohortId: 1 }));
      const body = await res.json();
      expect(body).toHaveProperty('results');
      expect(body.results[0]).toMatchObject({ email: 'x@y.com', status: 'reassigned' });
      expect(body.results[0]).not.toHaveProperty('error');
    });
  });
});
