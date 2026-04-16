import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/supabase/middleware', () => ({
  createSupabaseMiddlewareClient: vi.fn(),
}));

import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { middleware } from '@/middleware';

const mockCreateMiddlewareClient = createSupabaseMiddlewareClient as unknown as ReturnType<typeof vi.fn>;

function makeReq(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${pathname}`));
}

function makeMutatedResponse() {
  return NextResponse.next();
}

function makeMiddlewareMock(user: unknown) {
  return {
    user,
    response: makeMutatedResponse(),
  };
}

describe('middleware — Supabase session refresh + role guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Public paths ---

  it('passes through / with no user (public)', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/'));
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  it('passes through /signin with no user (public)', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/signin'));
    expect(res.status).toBeLessThan(300);
  });

  it('passes through /auth/callback with no user (public)', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/auth/callback'));
    expect(res.status).toBeLessThan(300);
  });

  it('passes through /associate/login with no user (public)', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/associate/login'));
    expect(res.status).toBeLessThan(300);
  });

  // --- Trainer paths ---

  it('allows /trainer with trainer role', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: { role: 'trainer' } }),
    );
    const res = await middleware(makeReq('/trainer'));
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /trainer with admin role', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: { role: 'admin' } }),
    );
    const res = await middleware(makeReq('/trainer'));
    expect(res.status).toBeLessThan(300);
  });

  it('redirects /trainer to /signin?next=/trainer when no session', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/trainer'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/signin');
    expect(loc.searchParams.get('next')).toBe('/trainer');
  });

  it('redirects /trainer to /signin when associate role (not trainer)', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: {} }),
    );
    const res = await middleware(makeReq('/trainer'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/signin');
  });

  it('allows /dashboard with trainer role', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: { role: 'trainer' } }),
    );
    const res = await middleware(makeReq('/dashboard'));
    expect(res.status).toBeLessThan(300);
  });

  it('redirects /dashboard to /signin when no session', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/dashboard'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/signin');
  });

  // --- Associate paths ---

  it('allows /associate/abc with any authenticated user', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: {} }),
    );
    const res = await middleware(makeReq('/associate/abc'));
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /associate/abc with trainer role', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(
      makeMiddlewareMock({ user_metadata: { role: 'trainer' } }),
    );
    const res = await middleware(makeReq('/associate/abc'));
    expect(res.status).toBeLessThan(300);
  });

  it('redirects /associate/abc to /signin?next=... when no session', async () => {
    mockCreateMiddlewareClient.mockResolvedValue(makeMiddlewareMock(null));
    const res = await middleware(makeReq('/associate/abc'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/signin');
    expect(loc.searchParams.get('next')).toBe('/associate/abc');
  });
});
