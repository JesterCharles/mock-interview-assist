import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Guard matrix for /associate/[slug]/interview (authenticated automated-interview entry).
 * Per Codex finding #2 / D-26, this is the ONLY legitimate caller for the
 * authenticated completion branch in Phase 10. Identity must be server-resolved
 * and passed to the client as props.
 */

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirectMock: vi.fn((_url: string) => {
    throw new Error('NEXT_REDIRECT');
  }),
  getCallerIdentityMock: vi.fn(),
  getAssociateIdBySlugMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
  notFound: mocks.notFoundMock,
}));

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: mocks.getCallerIdentityMock,
}));

vi.mock('@/lib/associateService', () => ({
  getAssociateIdBySlug: mocks.getAssociateIdBySlugMock,
}));

vi.mock('@/lib/slug-validation', () => ({
  validateSlug: (s: string) => ({ success: true, slug: s }),
}));

// Stub the client boundary so we can inspect the props identity is passed through.
vi.mock('@/components/interview/AuthenticatedInterviewClient', () => ({
  AuthenticatedInterviewClient: (props: { associateSlug: string; associateId: number }) => ({
    type: 'AuthenticatedInterviewClient',
    props,
  }),
}));

import AssociateInterviewPage from './page';

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('/associate/[slug]/interview guard matrix', () => {
  beforeEach(() => {
    mocks.redirectMock.mockClear();
    mocks.notFoundMock.mockClear();
    mocks.getCallerIdentityMock.mockReset();
    mocks.getAssociateIdBySlugMock.mockReset();
  });

  it('anonymous → redirects to /signin?as=associate&next=/associate/alice/interview', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'anonymous' });

    await expect(AssociateInterviewPage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/signin?as=associate&next=' + encodeURIComponent('/associate/alice/interview')
    );
  });

  it('stale ver (getCallerIdentity → anonymous) → redirect to login', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'anonymous' });

    await expect(AssociateInterviewPage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/signin?as=associate&next=' + encodeURIComponent('/associate/alice/interview')
    );
  });

  it('matching associate → renders client with identity props', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'associate', userId: 'u2', email: 'assoc@test.com', associateId: 42, associateSlug: 'alice' });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = (await AssociateInterviewPage(makeParams('alice'))) as {
      props: { children: unknown };
    };
    // The page wraps the client component; traverse to find identity props.
    const jsonString = JSON.stringify(result);
    expect(jsonString).toContain('"associateSlug":"alice"');
    expect(jsonString).toContain('"associateId":42');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('mismatched associate → 403 element', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'associate', userId: 'u2', email: 'assoc@test.com', associateId: 99, associateSlug: 'bob' });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = (await AssociateInterviewPage(makeParams('alice'))) as {
      props: { ['data-http-status']?: string };
    };
    expect(result?.props?.['data-http-status']).toBe('403');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('trainer → renders (allowed to kick off interview as any associate)', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateInterviewPage(makeParams('any-slug'));
    const jsonString = JSON.stringify(result);
    expect(jsonString).toContain('"associateSlug":"any-slug"');
    expect(jsonString).toContain('"associateId":42');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('slug not found → notFound()', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(null);

    await expect(AssociateInterviewPage(makeParams('ghost'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });
});
