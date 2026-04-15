import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

process.env.ASSOCIATE_SESSION_SECRET = 'test-secret-for-middleware';

import { middleware } from '@/middleware';
import { signAssociateToken } from '@/lib/associateSession';

function makeReq(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ');
  const headers = new Headers();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(new URL(`http://localhost${pathname}`), { headers });
}

describe('middleware — per-identity permission table', () => {
  const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');
  let validAssociateToken: string;

  beforeAll(async () => {
    validAssociateToken = await signAssociateToken(42, pinGeneratedAt);
  });

  // --- Trainer paths ---

  it('allows /trainer with nlm_session=authenticated', async () => {
    const res = await middleware(makeReq('/trainer', { nlm_session: 'authenticated' }));
    // NextResponse.next() → no redirect status
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects /trainer to /login when only associate_session is present', async () => {
    const res = await middleware(makeReq('/trainer', { associate_session: validAssociateToken }));
    expect(res.status).toBe(307);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    expect(new URL(loc!).pathname).toBe('/login');
  });

  it('redirects /trainer to /login when no cookies', async () => {
    const res = await middleware(makeReq('/trainer'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('redirects /dashboard to /login when only associate_session is present', async () => {
    const res = await middleware(makeReq('/dashboard', { associate_session: validAssociateToken }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('allows /dashboard with trainer cookie', async () => {
    const res = await middleware(makeReq('/dashboard', { nlm_session: 'authenticated' }));
    expect(res.status).toBeLessThan(300);
  });

  // --- Associate paths ---

  it('allows /associate/abc with valid associate_session (ver enforced downstream)', async () => {
    const res = await middleware(makeReq('/associate/abc', { associate_session: validAssociateToken }));
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /associate/abc with trainer cookie (trainer can view any associate)', async () => {
    const res = await middleware(makeReq('/associate/abc', { nlm_session: 'authenticated' }));
    expect(res.status).toBeLessThan(300);
  });

  it('redirects /associate/abc to /associate/login?next=... when no cookies', async () => {
    const res = await middleware(makeReq('/associate/abc'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/associate/login');
    expect(loc.searchParams.get('next')).toBe('/associate/abc');
  });

  it('redirects /associate/abc to /associate/login when associate_session is tampered', async () => {
    const tampered = validAssociateToken.slice(0, -4) + 'AAAA';
    const res = await middleware(makeReq('/associate/abc', { associate_session: tampered }));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/associate/login');
  });

  it('allows /associate/login with no cookies (public)', async () => {
    const res = await middleware(makeReq('/associate/login'));
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
  });

  // --- Unprotected paths ---

  it('allows unprotected paths with no cookies', async () => {
    const res = await middleware(makeReq('/some-public-page'));
    expect(res.status).toBeLessThan(300);
  });
});
