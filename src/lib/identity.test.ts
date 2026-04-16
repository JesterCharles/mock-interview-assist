import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock next/headers before any module that imports it (including supabase/server)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findUnique: vi.fn(),
    },
  },
}));

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';

const mockCreateClient = createSupabaseServerClient as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.associate.findUnique as unknown as ReturnType<typeof vi.fn>;

function makeSupabaseMock(user: unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  };
}

describe('getCallerIdentity (Supabase session)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns anonymous when no Supabase session', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null));
    const identity = await getCallerIdentity();
    expect(identity).toEqual({ kind: 'anonymous' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns admin when user_metadata.role = admin', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: 'uid-admin', email: 'admin@test.com', user_metadata: { role: 'admin' } }),
    );
    const identity = await getCallerIdentity();
    expect(identity).toEqual({ kind: 'admin', userId: 'uid-admin', email: 'admin@test.com' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns trainer when user_metadata.role = trainer', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: 'uid-trainer', email: 'trainer@test.com', user_metadata: { role: 'trainer' } }),
    );
    const identity = await getCallerIdentity();
    expect(identity).toEqual({ kind: 'trainer', userId: 'uid-trainer', email: 'trainer@test.com' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns associate shape when role absent and authUserId matches', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: 'uid-assoc', email: 'assoc@test.com', user_metadata: {} }),
    );
    mockFindUnique.mockResolvedValue({ id: 7, slug: 'alice' });
    const identity = await getCallerIdentity();
    expect(identity).toEqual({
      kind: 'associate',
      userId: 'uid-assoc',
      email: 'assoc@test.com',
      associateId: 7,
      associateSlug: 'alice',
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { authUserId: 'uid-assoc' },
      select: { id: true, slug: true },
    });
  });

  it('returns anonymous when associate role but no matching Associate row', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: 'uid-orphan', email: 'orphan@test.com', user_metadata: {} }),
    );
    mockFindUnique.mockResolvedValue(null);
    const identity = await getCallerIdentity();
    expect(identity).toEqual({ kind: 'anonymous' });
  });

  it('defaults to associate behavior when user_metadata.role is not set', async () => {
    mockCreateClient.mockResolvedValue(
      makeSupabaseMock({ id: 'uid-default', email: 'default@test.com', user_metadata: undefined }),
    );
    mockFindUnique.mockResolvedValue({ id: 3, slug: 'bob' });
    const identity = await getCallerIdentity();
    expect(identity).toEqual({
      kind: 'associate',
      userId: 'uid-default',
      email: 'default@test.com',
      associateId: 3,
      associateSlug: 'bob',
    });
  });
});
