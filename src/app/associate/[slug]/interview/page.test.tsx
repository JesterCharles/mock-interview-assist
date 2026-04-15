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
  isAuthenticatedSessionMock: vi.fn(),
  getAssociateIdentityMock: vi.fn(),
  getAssociateIdBySlugMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
  notFound: mocks.notFoundMock,
}));

vi.mock('@/lib/auth-server', () => ({
  isAuthenticatedSession: mocks.isAuthenticatedSessionMock,
  getAssociateIdentity: mocks.getAssociateIdentityMock,
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
    mocks.isAuthenticatedSessionMock.mockReset();
    mocks.getAssociateIdentityMock.mockReset();
    mocks.getAssociateIdBySlugMock.mockReset();
  });

  it('anonymous → redirects to /associate/login?next=/associate/alice/interview', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);

    await expect(AssociateInterviewPage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/associate/login?next=' + encodeURIComponent('/associate/alice/interview')
    );
  });

  it('stale ver (getAssociateIdentity → null) → redirect to login', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);

    await expect(AssociateInterviewPage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/associate/login?next=' + encodeURIComponent('/associate/alice/interview')
    );
  });

  it('matching associate → renders client with identity props', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue({ associateId: 42 });
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
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue({ associateId: 99 });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = (await AssociateInterviewPage(makeParams('alice'))) as {
      props: { ['data-http-status']?: string };
    };
    expect(result?.props?.['data-http-status']).toBe('403');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('trainer → renders (allowed to kick off interview as any associate)', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(true);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateInterviewPage(makeParams('any-slug'));
    const jsonString = JSON.stringify(result);
    expect(jsonString).toContain('"associateSlug":"any-slug"');
    expect(jsonString).toContain('"associateId":42');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('slug not found → notFound()', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(true);
    mocks.getAssociateIdBySlugMock.mockResolvedValue(null);

    await expect(AssociateInterviewPage(makeParams('ghost'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });
});
