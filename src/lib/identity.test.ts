import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// Ensure deterministic secret before importing modules that read it.
process.env.ASSOCIATE_SESSION_SECRET = 'test-secret-for-identity';

import { signAssociateToken } from '@/lib/associateSession';
import { getCallerIdentity } from '@/lib/identity';

function makeRequest(cookies: Record<string, string>): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ');
  const headers = new Headers();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  return new NextRequest(new URL('http://localhost/'), { headers });
}

describe('getCallerIdentity (cookie-only)', () => {
  const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');
  let validAssociateToken: string;

  beforeAll(() => {
    validAssociateToken = signAssociateToken(42, pinGeneratedAt);
  });

  it("returns { type: 'trainer' } when only nlm_session=authenticated", () => {
    const req = makeRequest({ nlm_session: 'authenticated' });
    expect(getCallerIdentity(req)).toEqual({ type: 'trainer' });
  });

  it("returns { type: 'associate', associateId, ver } for syntactically-valid associate_session", () => {
    const req = makeRequest({ associate_session: validAssociateToken });
    const ident = getCallerIdentity(req);
    expect(ident).toEqual({
      type: 'associate',
      associateId: 42,
      ver: pinGeneratedAt.toISOString(),
    });
  });

  it("returns { type: 'trainer' } when BOTH cookies present (trainer precedence)", () => {
    const req = makeRequest({
      nlm_session: 'authenticated',
      associate_session: validAssociateToken,
    });
    expect(getCallerIdentity(req)).toEqual({ type: 'trainer' });
  });

  it("returns { type: 'anonymous' } for tampered associate_session", () => {
    const tampered = validAssociateToken.slice(0, -4) + 'AAAA';
    const req = makeRequest({ associate_session: tampered });
    expect(getCallerIdentity(req)).toEqual({ type: 'anonymous' });
  });

  it("returns { type: 'anonymous' } when no cookies", () => {
    const req = makeRequest({});
    expect(getCallerIdentity(req)).toEqual({ type: 'anonymous' });
  });

  it("returns { type: 'anonymous' } when nlm_session is non-authenticated value and no associate cookie", () => {
    const req = makeRequest({ nlm_session: 'not-authenticated' });
    expect(getCallerIdentity(req)).toEqual({ type: 'anonymous' });
  });
});
