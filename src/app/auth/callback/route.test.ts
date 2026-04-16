import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const mockCreateClient = createSupabaseServerClient as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.associate.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.associate.update as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function makeSupabaseClient(opts: {
  exchangeError?: { message: string };
  user?: { id: string; email: string; user_metadata?: Record<string, unknown> } | null;
}) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        data: opts.exchangeError ? null : { session: {} },
        error: opts.exchangeError ?? null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user ?? null },
        error: null,
      }),
    },
  };
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /signin?error=missing-code when no code', async () => {
    const req = makeRequest({});
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/signin?error=missing-code');
  });

  it('redirects to /signin?error=invalid-link on exchange failure', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient({ exchangeError: { message: 'Invalid code' } })
    );
    const req = makeRequest({ code: 'badcode' });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/signin?error=invalid-link');
  });

  it('links authUserId for first-time associate with email match', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'auth-user-123', email: 'assoc@example.com', user_metadata: { role: 'associate' } },
    });
    mockCreateClient.mockResolvedValue(supabase);
    // No match by authUserId, but match by email
    mockFindUnique
      .mockResolvedValueOnce(null) // no authUserId match
      .mockResolvedValueOnce({ id: 1, slug: 'jane-doe', authUserId: null, email: 'assoc@example.com' }); // email match
    mockUpdate.mockResolvedValue({ id: 1, slug: 'jane-doe' });

    const req = makeRequest({ code: 'validcode' });
    const res = await GET(req);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { authUserId: 'auth-user-123' },
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/associate/jane-doe');
  });

  it('skips authUserId linkage when already linked', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'auth-user-123', email: 'assoc@example.com', user_metadata: { role: 'associate' } },
    });
    mockCreateClient.mockResolvedValue(supabase);
    // Returns existing associate matched by authUserId
    mockFindUnique.mockResolvedValueOnce({ id: 1, slug: 'jane-doe', authUserId: 'auth-user-123' });

    const req = makeRequest({ code: 'validcode' });
    const res = await GET(req);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toContain('/associate/jane-doe');
  });

  it('redirects to /signin?error=not-onboarded when associate email has no match', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'auth-user-999', email: 'unknown@example.com', user_metadata: { role: 'associate' } },
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockFindUnique
      .mockResolvedValueOnce(null) // no authUserId match
      .mockResolvedValueOnce(null); // no email match

    const req = makeRequest({ code: 'validcode' });
    const res = await GET(req);
    expect(res.headers.get('location')).toContain('/signin?error=not-onboarded');
  });

  it('handles P2002 race condition on authUserId linkage', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'auth-user-123', email: 'assoc@example.com', user_metadata: { role: 'associate' } },
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockFindUnique
      .mockResolvedValueOnce(null) // no authUserId match initially
      .mockResolvedValueOnce({ id: 1, slug: 'jane-doe', authUserId: null, email: 'assoc@example.com' }) // email match
      .mockResolvedValueOnce({ id: 1, slug: 'jane-doe', authUserId: 'auth-user-123' }); // re-read after P2002
    const p2002Error = new Error('Unique constraint failed');
    (p2002Error as NodeJS.ErrnoException & { code: string }).code = 'P2002';
    mockUpdate.mockRejectedValue(p2002Error);

    const req = makeRequest({ code: 'validcode' });
    const res = await GET(req);
    // Should NOT error out — should re-read and continue
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/associate/jane-doe');
  });

  it('redirects trainer to /trainer after exchange', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'trainer-id', email: 'trainer@example.com', user_metadata: { role: 'trainer' } },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const req = makeRequest({ code: 'trainercode' });
    const res = await GET(req);
    expect(res.headers.get('location')).toContain('/trainer');
  });

  it('redirects to /auth/update-password for recovery type', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'trainer-id', email: 'trainer@example.com', user_metadata: { role: 'trainer' } },
    });
    mockCreateClient.mockResolvedValue(supabase);

    const req = makeRequest({ code: 'recoverycode', type: 'recovery' });
    const res = await GET(req);
    expect(res.headers.get('location')).toContain('/auth/update-password');
  });
});
